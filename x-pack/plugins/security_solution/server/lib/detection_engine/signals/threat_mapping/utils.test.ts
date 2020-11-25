/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchAfterAndBulkCreateReturnType } from '../types';

import {
  calculateAdditiveMax,
  calculateMax,
  calculateMaxLookBack,
  combineConcurrentResults,
  combineResults,
} from './utils';

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

  describe('calculateMax', () => {
    test('it should return 0 for two empty arrays', () => {
      const max = calculateMax([], []);
      expect(max).toEqual('0');
    });

    test('it should return 5 for two arrays with the numbers 5', () => {
      const max = calculateMax(['5'], ['5']);
      expect(max).toEqual('5');
    });

    test('it should return 5 for two arrays with second array having just 5', () => {
      const max = calculateMax([], ['5']);
      expect(max).toEqual('5');
    });

    test('it should return 5 for two arrays with first array having just 5', () => {
      const max = calculateMax(['5'], []);
      expect(max).toEqual('5');
    });

    test('it should return 10 for the max of the two arrays when the max of each array is 10', () => {
      const max = calculateMax(['3', '5', '1'], ['3', '5', '10']);
      expect(max).toEqual('10');
    });

    test('it should return 10 for the max of the two arrays when the max of the first is 10', () => {
      const max = calculateMax(['3', '5', '10'], ['3', '5', '1']);
      expect(max).toEqual('10');
    });
  });

  describe('calculateMaxLookBack', () => {
    test('it should return null if both are null', () => {
      const max = calculateMaxLookBack(null, null);
      expect(max).toEqual(null);
    });

    test('it should return undefined if both are undefined', () => {
      const max = calculateMaxLookBack(undefined, undefined);
      expect(max).toEqual(undefined);
    });

    test('it should return null if both one is null and other other is undefined', () => {
      const max = calculateMaxLookBack(undefined, null);
      expect(max).toEqual(null);
    });

    test('it should return null if both one is null and other other is undefined with flipped arguments', () => {
      const max = calculateMaxLookBack(null, undefined);
      expect(max).toEqual(null);
    });

    test('it should return a date time if one argument is null', () => {
      const max = calculateMaxLookBack(null, new Date('2020-09-16T03:34:32.390Z'));
      expect(max).toEqual(new Date('2020-09-16T03:34:32.390Z'));
    });

    test('it should return a date time if one argument is null with flipped arguments', () => {
      const max = calculateMaxLookBack(new Date('2020-09-16T03:34:32.390Z'), null);
      expect(max).toEqual(new Date('2020-09-16T03:34:32.390Z'));
    });

    test('it should return a date time if one argument is undefined', () => {
      const max = calculateMaxLookBack(new Date('2020-09-16T03:34:32.390Z'), undefined);
      expect(max).toEqual(new Date('2020-09-16T03:34:32.390Z'));
    });

    test('it should return a date time if one argument is undefined with flipped arguments', () => {
      const max = calculateMaxLookBack(undefined, new Date('2020-09-16T03:34:32.390Z'));
      expect(max).toEqual(new Date('2020-09-16T03:34:32.390Z'));
    });

    test('it should return a date time that is larger than the other', () => {
      const max = calculateMaxLookBack(
        new Date('2020-10-16T03:34:32.390Z'),
        new Date('2020-09-16T03:34:32.390Z')
      );
      expect(max).toEqual(new Date('2020-10-16T03:34:32.390Z'));
    });

    test('it should return a date time that is larger than the other with arguments flipped', () => {
      const max = calculateMaxLookBack(
        new Date('2020-09-16T03:34:32.390Z'),
        new Date('2020-10-16T03:34:32.390Z')
      );
      expect(max).toEqual(new Date('2020-10-16T03:34:32.390Z'));
    });
  });

  describe('combineConcurrentResults', () => {
    test('it should use the maximum found if given an empty array for newResults', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };
      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['30'], // max value from existingResult.searchAfterTimes
        bulkCreateTimes: ['25'], // max value from existingResult.bulkCreateTimes
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };
      const combinedResults = combineConcurrentResults(existingResult, []);
      expect(combinedResults).toEqual(expectedResult);
    });

    test('it should work with empty arrays for searchAfterTimes and bulkCreateTimes', () => {
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
        searchAfterTimes: [],
        bulkCreateTimes: [],
        lastLookBackDate: undefined,
        createdSignalsCount: 0,
        errors: [],
      };
      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['30'], // max value from existingResult.searchAfterTimes
        bulkCreateTimes: ['25'], // max value from existingResult.bulkCreateTimes
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };

      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
      expect(combinedResults).toEqual(expectedResult);
    });

    test('it should get the max of two new results and then combine the result with an existingResult correctly', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'], // max is 30
        bulkCreateTimes: ['5', '15', '25'], // max is 25
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };
      const newResult1: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 5,
        errors: [],
      };
      const newResult2: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['40', '5', '15'],
        bulkCreateTimes: ['50', '5', '15'],
        lastLookBackDate: new Date('2020-09-16T04:34:32.390Z'),
        createdSignalsCount: 8,
        errors: [],
      };

      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['70'], // max value between newResult1 and newResult2 + max array value of existingResult (40 + 30 = 70)
        bulkCreateTimes: ['75'], // max value between newResult1 and newResult2 + max array value of existingResult (50 + 25 = 75)
        lastLookBackDate: new Date('2020-09-16T04:34:32.390Z'), // max lastLookBackDate
        createdSignalsCount: 16, // all the signals counted together (8 + 5 + 3)
        errors: [],
      };

      const combinedResults = combineConcurrentResults(existingResult, [newResult1, newResult2]);
      expect(combinedResults).toEqual(expectedResult);
    });

    test('it should get the max of two new results and then combine the result with an existingResult correctly when the results are flipped around', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'], // max is 30
        bulkCreateTimes: ['5', '15', '25'], // max is 25
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };
      const newResult1: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 5,
        errors: [],
      };
      const newResult2: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['40', '5', '15'],
        bulkCreateTimes: ['50', '5', '15'],
        lastLookBackDate: new Date('2020-09-16T04:34:32.390Z'),
        createdSignalsCount: 8,
        errors: [],
      };

      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['70'], // max value between newResult1 and newResult2 + max array value of existingResult (40 + 30 = 70)
        bulkCreateTimes: ['75'], // max value between newResult1 and newResult2 + max array value of existingResult (50 + 25 = 75)
        lastLookBackDate: new Date('2020-09-16T04:34:32.390Z'), // max lastLookBackDate
        createdSignalsCount: 16, // all the signals counted together (8 + 5 + 3)
        errors: [],
      };

      const combinedResults = combineConcurrentResults(existingResult, [newResult2, newResult1]); // two array elements are flipped
      expect(combinedResults).toEqual(expectedResult);
    });

    test('it should return the max date correctly if one date contains a null', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'], // max is 30
        bulkCreateTimes: ['5', '15', '25'], // max is 25
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        errors: [],
      };
      const newResult1: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 5,
        errors: [],
      };
      const newResult2: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['40', '5', '15'],
        bulkCreateTimes: ['50', '5', '15'],
        lastLookBackDate: null,
        createdSignalsCount: 8,
        errors: [],
      };

      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        searchAfterTimes: ['70'], // max value between newResult1 and newResult2 + max array value of existingResult (40 + 30 = 70)
        bulkCreateTimes: ['75'], // max value between newResult1 and newResult2 + max array value of existingResult (50 + 25 = 75)
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'), // max lastLookBackDate
        createdSignalsCount: 16, // all the signals counted together (8 + 5 + 3)
        errors: [],
      };

      const combinedResults = combineConcurrentResults(existingResult, [newResult1, newResult2]);
      expect(combinedResults).toEqual(expectedResult);
    });

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
      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
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
      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
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
      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
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
      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
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
      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
      expect(combinedResults).toEqual(
        expect.objectContaining({
          errors: ['error 1', 'error 2', 'error 3', 'error 4', 'error 5'],
        })
      );
    });
  });
});
