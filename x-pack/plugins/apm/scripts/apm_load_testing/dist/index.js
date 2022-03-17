"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const url = process.env.url || "http://localhost:5601/azt/app/apm/";
// curl -X POST "localhost:9200/_cache/clear?pretty"
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function run(page) {
    // set the HTTP Basic Authentication credential
    await page.authenticate({
        username: "admin",
        password: "GXFSVUgqb1xNHd9GlFSKJAxc",
    });
    console.log(`Opening ${url}`);
    // wait for all requests to have completed
    await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }),
        page.goto(url),
    ]);
    await page.screenshot({ path: "buddy-screenshot.png" });
    console.log("Completed");
    await sleep(1000);
    return run(page);
}
puppeteer_1.default
    .launch({ headless: true })
    .then((browser) => browser.newPage())
    .then((page) => run(page))
    .catch((e) => console.error(e));
