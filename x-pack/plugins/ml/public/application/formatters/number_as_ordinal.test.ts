/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { numberAsOrdinal } from './number_as_ordinal';

describe('ML - numberAsOrdinal formatter', () => {
  const tests = [
    { number: 0, asOrdinal: '0th' },
    { number: 1, asOrdinal: '1st' },
    { number: 2.2, asOrdinal: '2nd' },
    { number: 3, asOrdinal: '3rd' },
    { number: 5, asOrdinal: '5th' },
    { number: 10, asOrdinal: '10th' },
    { number: 11, asOrdinal: '11th' },
    { number: 22, asOrdinal: '22nd' },
    { number: 33, asOrdinal: '33rd' },
    { number: 44.4, asOrdinal: '44th' },
    { number: 100, asOrdinal: '100th' },
  ];
  test('returns the expected numeral format', () => {
    tests.forEach(test => {
      expect(numberAsOrdinal(test.number)).toBe(test.asOrdinal);
    });
  });
});
