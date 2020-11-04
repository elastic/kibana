/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decimalToPct, pctToDecimal } from './corrected_percent_convert';

describe('decimalToPct', () => {
  test('should retain correct floating point precision up to 10 decimal places', () => {
    // Most of these cases would still work fine just doing x * 100 instead of passing it through
    // decimalToPct, but the function still needs to work regardless
    expect(decimalToPct(0)).toBe(0);
    expect(decimalToPct(0.1)).toBe(10);
    expect(decimalToPct(0.01)).toBe(1);
    expect(decimalToPct(0.014)).toBe(1.4);
    expect(decimalToPct(0.0141)).toBe(1.41);
    expect(decimalToPct(0.01414)).toBe(1.414);
    // This case is known to fail without decimalToPct; vanilla JS 0.014141 * 100 === 1.4141000000000001
    expect(decimalToPct(0.014141)).toBe(1.4141);
    expect(decimalToPct(0.0141414)).toBe(1.41414);
    expect(decimalToPct(0.01414141)).toBe(1.414141);
    expect(decimalToPct(0.014141414)).toBe(1.4141414);
  });
  test('should also work with values greater than 1', () => {
    expect(decimalToPct(2)).toBe(200);
    expect(decimalToPct(2.1)).toBe(210);
    expect(decimalToPct(2.14)).toBe(214);
    expect(decimalToPct(2.14141414)).toBe(214.141414);
  });
});

describe('pctToDecimal', () => {
  test('should retain correct floating point precision up to 10 decimal places', () => {
    expect(pctToDecimal(0)).toBe(0);
    expect(pctToDecimal(10)).toBe(0.1);
    expect(pctToDecimal(1)).toBe(0.01);
    expect(pctToDecimal(1.4)).toBe(0.014);
    expect(pctToDecimal(1.41)).toBe(0.0141);
    expect(pctToDecimal(1.414)).toBe(0.01414);
    expect(pctToDecimal(1.4141)).toBe(0.014141);
    expect(pctToDecimal(1.41414)).toBe(0.0141414);
    expect(pctToDecimal(1.414141)).toBe(0.01414141);
    expect(pctToDecimal(1.4141414)).toBe(0.014141414);
  });
  test('should also work with values greater than 100%', () => {
    expect(pctToDecimal(200)).toBe(2);
    expect(pctToDecimal(210)).toBe(2.1);
    expect(pctToDecimal(214)).toBe(2.14);
    expect(pctToDecimal(214.141414)).toBe(2.14141414);
  });
});
