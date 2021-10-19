/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchAfterAndBulkCreateReturnType } from '../types';
import { sampleSignalHit } from '../__mocks__/es_results';
import { ThreatMatchNamedQuery } from './types';

import {
  buildExecutionIntervalValidator,
  calculateAdditiveMax,
  calculateMax,
  calculateMaxLookBack,
  combineConcurrentResults,
  combineResults,
  decodeThreatMatchNamedQuery,
  encodeThreatMatchNamedQuery,
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
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const combinedResults = combineResults(existingResult, newResult);
      expect(combinedResults.success).toEqual(true);
    });

    test('it should combine two results with success set to "false" if one of them is "false"', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const combinedResults = combineResults(existingResult, newResult);
      expect(combinedResults.success).toEqual(false);
    });

    test('it should use the latest date if it is set in the new result', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const combinedResults = combineResults(existingResult, newResult);
      expect(combinedResults.lastLookBackDate?.toISOString()).toEqual('2020-09-16T03:34:32.390Z');
    });

    test('it should combine the searchAfterTimes and the bulkCreateTimes', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
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
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: ['error 1', 'error 2', 'error 3'],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: ['error 4', 'error 1', 'error 3', 'error 5'],
        warningMessages: [],
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
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['30'], // max value from existingResult.searchAfterTimes
        bulkCreateTimes: ['25'], // max value from existingResult.bulkCreateTimes
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const combinedResults = combineConcurrentResults(existingResult, []);
      expect(combinedResults).toEqual(expectedResult);
    });

    test('it should work with empty arrays for searchAfterTimes and bulkCreateTimes and createdSignals', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: [],
        bulkCreateTimes: [],
        lastLookBackDate: undefined,
        createdSignalsCount: 0,
        createdSignals: [],
        errors: [],
        warningMessages: [],
      };
      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['30'], // max value from existingResult.searchAfterTimes
        bulkCreateTimes: ['25'], // max value from existingResult.bulkCreateTimes
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
      expect(combinedResults).toEqual(expectedResult);
    });

    test('it should get the max of two new results and then combine the result with an existingResult correctly', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'], // max is 30
        bulkCreateTimes: ['5', '15', '25'], // max is 25
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const newResult1: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 5,
        createdSignals: Array(5).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const newResult2: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['40', '5', '15'],
        bulkCreateTimes: ['50', '5', '15'],
        lastLookBackDate: new Date('2020-09-16T04:34:32.390Z'),
        createdSignalsCount: 8,
        createdSignals: Array(8).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['70'], // max value between newResult1 and newResult2 + max array value of existingResult (40 + 30 = 70)
        bulkCreateTimes: ['75'], // max value between newResult1 and newResult2 + max array value of existingResult (50 + 25 = 75)
        lastLookBackDate: new Date('2020-09-16T04:34:32.390Z'), // max lastLookBackDate
        createdSignalsCount: 16, // all the signals counted together (8 + 5 + 3)
        createdSignals: Array(16).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const combinedResults = combineConcurrentResults(existingResult, [newResult1, newResult2]);
      expect(combinedResults).toEqual(expectedResult);
    });

    test('it should get the max of two new results and then combine the result with an existingResult correctly when the results are flipped around', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'], // max is 30
        bulkCreateTimes: ['5', '15', '25'], // max is 25
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const newResult1: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 5,
        createdSignals: Array(5).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const newResult2: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['40', '5', '15'],
        bulkCreateTimes: ['50', '5', '15'],
        lastLookBackDate: new Date('2020-09-16T04:34:32.390Z'),
        createdSignalsCount: 8,
        createdSignals: Array(8).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['70'], // max value between newResult1 and newResult2 + max array value of existingResult (40 + 30 = 70)
        bulkCreateTimes: ['75'], // max value between newResult1 and newResult2 + max array value of existingResult (50 + 25 = 75)
        lastLookBackDate: new Date('2020-09-16T04:34:32.390Z'), // max lastLookBackDate
        createdSignalsCount: 16, // all the signals counted together (8 + 5 + 3)
        createdSignals: Array(16).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const combinedResults = combineConcurrentResults(existingResult, [newResult2, newResult1]); // two array elements are flipped
      expect(combinedResults).toEqual(expectedResult);
    });

    test('it should return the max date correctly if one date contains a null', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'], // max is 30
        bulkCreateTimes: ['5', '15', '25'], // max is 25
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const newResult1: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 5,
        createdSignals: Array(5).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const newResult2: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['40', '5', '15'],
        bulkCreateTimes: ['50', '5', '15'],
        lastLookBackDate: null,
        createdSignalsCount: 8,
        createdSignals: Array(8).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const expectedResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['70'], // max value between newResult1 and newResult2 + max array value of existingResult (40 + 30 = 70)
        bulkCreateTimes: ['75'], // max value between newResult1 and newResult2 + max array value of existingResult (50 + 25 = 75)
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'), // max lastLookBackDate
        createdSignalsCount: 16, // all the signals counted together (8 + 5 + 3)
        createdSignals: Array(16).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const combinedResults = combineConcurrentResults(existingResult, [newResult1, newResult2]);
      expect(combinedResults).toEqual(expectedResult);
    });

    test('it should combine two results with success set to "true" if both are "true"', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
      expect(combinedResults.success).toEqual(true);
    });

    test('it should combine two results with success set to "false" if one of them is "false"', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
      expect(combinedResults.success).toEqual(false);
    });

    test('it should use the latest date if it is set in the new result', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };
      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
      expect(combinedResults.lastLookBackDate?.toISOString()).toEqual('2020-09-16T03:34:32.390Z');
    });

    test('it should combine the searchAfterTimes and the bulkCreateTimes', () => {
      const existingResult: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: [],
        warningMessages: [],
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
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: undefined,
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: ['error 1', 'error 2', 'error 3'],
        warningMessages: [],
      };

      const newResult: SearchAfterAndBulkCreateReturnType = {
        success: true,
        warning: false,
        searchAfterTimes: ['10', '20', '30'],
        bulkCreateTimes: ['5', '15', '25'],
        lastLookBackDate: new Date('2020-09-16T03:34:32.390Z'),
        createdSignalsCount: 3,
        createdSignals: Array(3).fill(sampleSignalHit()),
        errors: ['error 4', 'error 1', 'error 3', 'error 5'],
        warningMessages: [],
      };
      const combinedResults = combineConcurrentResults(existingResult, [newResult]);
      expect(combinedResults).toEqual(
        expect.objectContaining({
          errors: ['error 1', 'error 2', 'error 3', 'error 4', 'error 5'],
        })
      );
    });
  });

  describe('threat match queries', () => {
    describe('encodeThreatMatchNamedQuery()', () => {
      it('generates a string that can be later decoded', () => {
        const encoded = encodeThreatMatchNamedQuery({
          id: 'id',
          index: 'index',
          field: 'field',
          value: 'value',
        });

        expect(typeof encoded).toEqual('string');
      });
    });

    describe('decodeThreatMatchNamedQuery()', () => {
      it('can decode an encoded query', () => {
        const query: ThreatMatchNamedQuery = {
          id: 'my_id',
          index: 'index',
          field: 'threat.indicator.domain',
          value: 'host.name',
        };

        const encoded = encodeThreatMatchNamedQuery(query);
        const decoded = decodeThreatMatchNamedQuery(encoded);

        expect(decoded).not.toBe(query);
        expect(decoded).toEqual(query);
      });

      it('raises an error if the input is invalid', () => {
        const badInput = 'nope';

        expect(() => decodeThreatMatchNamedQuery(badInput)).toThrowError(
          'Decoded query is invalid. Decoded value: {"id":"nope"}'
        );
      });

      it('raises an error if the query is missing a value', () => {
        const badQuery: ThreatMatchNamedQuery = {
          id: 'my_id',
          index: 'index',
          // @ts-expect-error field intentionally undefined
          field: undefined,
          value: 'host.name',
        };
        const badInput = encodeThreatMatchNamedQuery(badQuery);

        expect(() => decodeThreatMatchNamedQuery(badInput)).toThrowError(
          'Decoded query is invalid. Decoded value: {"id":"my_id","index":"index","field":"","value":"host.name"}'
        );
      });
    });
  });

  describe('buildExecutionIntervalValidator', () => {
    it('succeeds if the validator is called within the specified interval', () => {
      const validator = buildExecutionIntervalValidator('1m');
      expect(() => validator()).not.toThrowError();
    });

    it('throws an error if the validator is called after the specified interval', async () => {
      const validator = buildExecutionIntervalValidator('1s');

      await new Promise((r) => setTimeout(r, 1001));
      expect(() => validator()).toThrowError(
        'Current rule execution has exceeded its allotted interval (1s) and has been stopped.'
      );
    });

    it('throws an error if the interval cannot be parsed', () => {
      expect(() => buildExecutionIntervalValidator('badString')).toThrowError(
        'Unable to parse rule interval (badString); stopping rule execution since allotted duration is undefined'
      );
    });
  });
});
