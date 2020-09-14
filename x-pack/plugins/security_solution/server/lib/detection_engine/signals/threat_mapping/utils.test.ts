/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { calculateAdditiveMax } from './utils';

describe('utils', () => {
  describe('calculateAdditiveMax', () => {
    test('it should return 0 for two empty arrays', () => {
      const max = calculateAdditiveMax([], []);
      expect(max).toEqual(['0']);
    });

    test('it should return 10 for two arrays with the numbers 5', () => {
      const max = calculateAdditiveMax(['5'], ['5']);
      expect(max).toEqual(['10']);
    });

    test('it should return 5 for two arrays with second array having just 5', () => {
      const max = calculateAdditiveMax([], ['5']);
      expect(max).toEqual(['5']);
    });

    test('it should return 5 for two arrays with first array having just 5', () => {
      const max = calculateAdditiveMax(['5'], []);
      expect(max).toEqual(['5']);
    });

    test('it should return 10 for the max of the two arrays added together when the max of each array is 5, "5 + 5 = 10"', () => {
      const max = calculateAdditiveMax(['3', '5', '1'], ['3', '5', '1']);
      expect(max).toEqual(['10']);
    });
  });
});
