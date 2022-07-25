/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const assertCloseTo = (actual: number, expected: number, precision: number) => {
  if (Math.abs(expected - actual) > precision) {
    throw new Error(`expected [${expected}] to be within ${precision} of ${actual}`);
  }

  // if actual is undefined above math condition will be NAN and it will be always false
  if (actual === undefined) {
    throw new Error(`expected close to [${expected}] but got [${actual}]`);
  }
};
