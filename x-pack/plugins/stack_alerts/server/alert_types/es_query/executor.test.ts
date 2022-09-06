/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSearchParams,
  getValidTimefieldSort,
  tryToParseAsDate,
  getContextConditionsDescription,
} from './executor';
import { OnlyEsQueryRuleParams } from './types';
import { Comparator } from '../../../common/comparator_types';

describe('es_query executor', () => {
  const defaultProps = {
    size: 3,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [],
    thresholdComparator: '>=',
    esQuery: '{ "query": "test-query" }',
    index: ['test-index'],
    timeField: '',
    searchType: 'esQuery',
    excludeHitsFromPreviousRun: true,
  };
  describe('tryToParseAsDate', () => {
    it.each<[string | number]>([['2019-01-01T00:00:00.000Z'], [1546300800000]])(
      'should parse as date correctly',
      (value) => {
        expect(tryToParseAsDate(value)).toBe('2019-01-01T00:00:00.000Z');
      }
    );
    it.each<[string | null | undefined]>([[null], ['invalid date'], [undefined]])(
      'should not parse as date',
      (value) => {
        expect(tryToParseAsDate(value)).toBe(undefined);
      }
    );
  });

  describe('getValidTimefieldSort', () => {
    it('should return valid time field', () => {
      const result = getValidTimefieldSort([
        null,
        'invalid date',
        '2018-12-31T19:00:00.000Z',
        1546282800000,
      ]);
      expect(result).toEqual('2018-12-31T19:00:00.000Z');
    });
  });

  describe('getSearchParams', () => {
    it('should return search params correctly', () => {
      const result = getSearchParams(defaultProps as OnlyEsQueryRuleParams);
      expect(result.parsedQuery.query).toBe('test-query');
    });

    it('should throw invalid query error', () => {
      expect(() =>
        getSearchParams({ ...defaultProps, esQuery: '' } as OnlyEsQueryRuleParams)
      ).toThrow('invalid query specified: "" - query must be JSON');
    });

    it('should throw invalid query error due to missing query property', () => {
      expect(() =>
        getSearchParams({
          ...defaultProps,
          esQuery: '{ "someProperty": "test-query" }',
        } as OnlyEsQueryRuleParams)
      ).toThrow('invalid query specified: "{ "someProperty": "test-query" }" - query must be JSON');
    });

    it('should throw invalid window size error', () => {
      expect(() =>
        getSearchParams({
          ...defaultProps,
          timeWindowSize: 5,
          timeWindowUnit: 'r',
        } as OnlyEsQueryRuleParams)
      ).toThrow('invalid format for windowSize: "5r"');
    });
  });

  describe('getContextConditionsDescription', () => {
    it('should return conditions correctly', () => {
      const result = getContextConditionsDescription(Comparator.GT, [10]);
      expect(result).toBe(`Number of matching documents is greater than 10`);
    });

    it('should return conditions correctly when isRecovered is true', () => {
      const result = getContextConditionsDescription(Comparator.GT, [10], true);
      expect(result).toBe(`Number of matching documents is NOT greater than 10`);
    });

    it('should return conditions correctly when multiple thresholds provided', () => {
      const result = getContextConditionsDescription(Comparator.BETWEEN, [10, 20], true);
      expect(result).toBe(`Number of matching documents is NOT between 10 and 20`);
    });
  });
});
