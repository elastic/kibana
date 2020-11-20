/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const logger = require('./logger');

module.exports = {
  splitX,
  delay,
  resolveable,
  sortById,
  sortByDate,
  sortBySemver,
  shortDateString,
  retry,
  times,
  arrayFrom,
};

/**
 * @template T
 * @type { (times: number, waitSeconds: number, name: string, fn: () => Promise<T>) => Promise<T>}
 **/
async function retry(times, waitSeconds, name, fn) {
  try {
    return await fn();
  } catch (err) {
    if (times === 0) {
      logger.log(`error ${name}, exceeded retries: ${err}`);
      throw err;
    }

    logger.log(`error ${name}, retry in ${waitSeconds} seconds, ${times} retries left: ${err}`);
    await delay(waitSeconds * 1000);
    return await retry(times - 1, waitSeconds, name, fn);
  }
}

/** @type { (spec: string) => [number, number] | null } */
function splitX(spec) {
  spec = spec.replace(/\s+/g, '');
  spec = spec.replace(/GB$/i, '');
  const match = spec.match(/^(\d+)x(\d+)$/);
  if (match == null) return null;
  const n1 = parseInt(match[1]);
  const n2 = parseInt(match[2]);
  return [n1, n2];
}

/** @type { (ms: number) => Promise<void> } */
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** @type { () => { promise: Promise<any>; resolve: (value: any) => void; reject: (reason: any) => void } } */
function resolveable() {
  let resolve;
  let reject;
  const promise = new Promise((r, e) => {
    resolve = r;
    reject = e;
  });

  return { promise, resolve, reject };
}

/** @type { (a: { id: string }, b: { id: string }) => number } */
function sortById(a, b) {
  return a.id.localeCompare(b.id);
}

/** @type { (a: { date: string }, b: { date: string }) => number } */
function sortByDate(a, b) {
  return a.date.localeCompare(b.date);
}

/** @type { (a: string, b: string) => number } */
function sortBySemver(a, b) {
  if (a === b) return 0;

  const pattern = /^(\d+)\.(\d+)\.(\d+)(-.*)?$/;
  const [, majA, minA, patA, bldA = ''] = a.match(pattern);
  const [, majB, minB, patB, bldB = ''] = b.match(pattern);

  const majAn = parseInt(majA, 10);
  const minAn = parseInt(minA, 10);
  const patAn = parseInt(patA, 10);
  const majBn = parseInt(majB, 10);
  const minBn = parseInt(minB, 10);
  const patBn = parseInt(patB, 10);

  if (majAn > majBn) return 1;
  if (majAn < majBn) return -1;

  if (minAn > minBn) return 1;
  if (minAn < minBn) return -1;

  if (patAn > patBn) return 1;
  if (patAn < patBn) return -1;

  return bldA.localeCompare(bldB);
}

/** @type { (date: Date) => string } */
function shortDateString(date) {
  return date
    .toISOString()
    .substr(2, 17) // yy-mm-ddThh:mm:ss
    .replace(/-/g, '') // yymmddThh:mm:ss
    .replace(/:/g, '') // yymmddThhmmss
    .replace('T', '-'); // yymmdd-hhmmss
}

/** @type { (n: number, fn: (n?: number) => void) => void } */
function times(n, fn) {
  for (let i = 0; i < n; i++) {
    fn(i);
  }
}

/**
 * @template O
 * @type { (n: number, fn: (n: number) => O) => O[] }
 */
function arrayFrom(n, fn) {
  /** @type { O[] } */
  const result = [];
  times(n, (i) => {
    result.push(fn(i));
  });
  return result;
}

// @ts-ignore
if (require.main === module) test();

function test() {
  console.log(`shortDateString(): ${shortDateString(new Date())}`);
  const splitXtests = ['1x1', '2 x 2', '3 x 3GB', ' 4 x 4 gb '];
  for (const splitXtest of splitXtests) {
    console.log(`splitX("${splitXtest}"): ${splitX(splitXtest).join(',')}`);
  }
}
