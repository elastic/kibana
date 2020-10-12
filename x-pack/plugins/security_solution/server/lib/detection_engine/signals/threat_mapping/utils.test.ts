/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchAfterAndBulkCreateReturnType } from '../types';

import { calculateAdditiveMax, combineResults } from './utils';

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

  describe('combineResults', () => {
    test('it should combine two results with success set to "true" if both are "true"', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };
      const combinedResults = combineResults(existingResult, newResult);
      expect(combinedResults.success).toEqual(true);
    });

    test('it should combine two results with success set to "false" if one of them is "false"', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };
      const combinedResults = combineResults(existingResult, newResult);
      expect(combinedResults.success).toEqual(false);
    });

    test('it should use the latest date if it is set in the new result', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 3,
        errors: [],
      };
      const combinedResults = combineResults(existingResult, newResult);
      expect(combinedResults.lastLookBackDate?.toISOString()).toEqual('2020-09-16T03:34:32.390Z');
    });

    test('it should combine the searchAfterTimes and the bulkCreateTimes', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 3,
        errors: [],
      };
      const combinedResults = combineResults(existingResult, newResult);
      expect(combinedResults).toEqual(
        expect.objectContaining({
          searchAfterTimes: ['60'],
          bulkCreateTimes: ['50'],
        })
      );
    });

    test('it should combine errors together without duplicates', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: ['error 1', 'error 2', 'error 3'],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 3,
        errors: ['error 4', 'error 1', 'error 3', 'error 5'],
      };
      const combinedResults = combineResults(existingResult, newResult);
      expect(combinedResults).toEqual(
        expect.objectContaining({
          errors: ['error 1', 'error 2', 'error 3', 'error 4', 'error 5'],
        })
      );
    });
  });
});
