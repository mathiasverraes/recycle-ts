import {Router} from "express";
import bodyParser from "body-parser";

const routes = Router();
routes.use(bodyParser.json());

routes.get("/validate", (request, response, next) => {
    return response.json({});
});

// The price for construction waste is 0.15 euro per kg.
// The price for green waste is 0.09 euro per kg.
const wastePrices: any = {
    "Default": {
        "Construction waste": {price: 0.15, exemption: 0},
        "Green waste": {price: 0.09, exemption: 0},

    }, "South Park": {
        "Construction waste": {price: 0.18, exemption: 100},
        "Green waste": {price: 0.12, exemption: 50},
    }
}

function freshState() {
    return {
        card_id: null,
        priceClass: "Default",
        price_amount: 0
    };
}

routes.post("/handle-command", (request, response, next) => {
    console.log(JSON.stringify(request.body, null, 2))


    let state = request.body.history.reduce(routeEvents, freshState());


    let answer = {
        event_id: "foo",
        created_at: new Date().toISOString(),
        type: "PriceWasCalculated",
        payload: {
            card_id: state.card_id,
            price_amount: state.price_amount.toFixed(2),
            price_currency: "EUR",
        },
    };
    return response.json(answer);
});

function findPriceClassForCity(city: any) {
    return city in wastePrices ? wastePrices[city] : wastePrices["Default"];
}

function projectIdCardRegistered(state: any, event: any) {
    state.card_id = event.payload.card_id;
    state.priceClass = findPriceClassForCity(event.payload.city);
    return state;
}

function projectIdCardScannedAtEntranceGate(state: any, event: any) {
    return state;
}

function projectIdCardScannedAtExitGate(state: any, event: any) {
    return state;
}

function projectFractionWasDropped(state: any, event: any) {
    const fractionType = event.payload.fraction_type;
    const weight = event.payload.weight;
    const priceClass = state.priceClass;
    const nonExemptedWaste = Math.max(0, weight - priceClass[fractionType].exemption);
    const wastePrice = priceClass[fractionType].price;
    state.price_amount += nonExemptedWaste * wastePrice;
    return state;
}

const routeEvents = function (state: any, event: any): any {

    switch (event.type) {
        case "IdCardRegistered":
            state = projectIdCardRegistered(state, event);
            break;
        case "IdCardScannedAtEntranceGate":
            state = projectIdCardScannedAtEntranceGate(state, event);
            break;
        case "IdCardScannedAtExitGate":
            state = projectIdCardScannedAtExitGate(state, event);
            break;
        case "FractionWasDropped":
            state = projectFractionWasDropped(state, event);
            break;
        default:
            throw " event " + event.type + " is not being processed";

    }
    return state;
}

export {routes}
