/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const DEBUG = process.env.DEBUG != null;

module.exports = {
  debug,
  log,
  logErrorAndExit,
  printTime,
};

const TzOffset = getTzOffset();

let PrintTime = false;

/** @type { (enable?: boolean) => boolean } */
function printTime(enable) {
  if (enable !== null) {
    PrintTime = enable;
  }
  return PrintTime;
}

/** @type { (message: string) => void } */
function debug(message) {
  if (!DEBUG) return;
  log(`DEBUG: ${message}`);
}

/** @type { (message: string) => void } */
function log(message) {
  if (!PrintTime) return console.log(message);

  console.log(`${getTime()} - ${message}`);
}

/** @type { (message: string) => void } */
function logErrorAndExit(message) {
  log(message);
  process.exit(1);
}

/** @type { () => string } */
function getTime() {
  const dISO = new Date();
  const dLoc = new Date(dISO.valueOf() - TzOffset);
  return dLoc.toISOString().substr(11, 8);
}

/** @type { () => number } */
function getTzOffset() {
  const d = new Date();
  const dISO = d.toISOString();
  const dLoc = dISO.substr(0, 23);
  const dISOMs = Date.parse(dISO);
  const dLocMs = Date.parse(dLoc);
  return dLocMs - dISOMs;
}

// @ts-ignore
if (require.main === module) test();

async function test() {}
