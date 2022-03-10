/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSearchParams, getValidTimefieldSort, tryToParseAsDate } from './executor';
import { OnlyEsQueryAlertParams } from './types';

describe('es_query executor', () => {
  const defaultProps = {
    size: 3,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [],
    thresholdComparator: '>=',
    searchType: 'esQuery',
    esQuery: '{ "query": "test-query" }',
    index: ['test-index'],
    timeField: '',
  };
  describe('tryToParseAsDate', () => {
    it('should parse as date correctly', () => {
      const expectedResult = '2018-12-31T19:00:00.000Z';
      expect(expectedResult).toBe(tryToParseAsDate('2019-01-01T00:00:00'));
      expect(expectedResult).toBe(tryToParseAsDate(1546282800000));
    });

    it('should not parse as date', () => {
      expect(undefined).toBe(tryToParseAsDate(null));
      expect(undefined).toBe(tryToParseAsDate(undefined));
      expect(undefined).toBe(tryToParseAsDate('invalid date'));
    });
  });

  describe('getValidTimefieldSort', () => {
    it('should return valid time field', () => {
      const result = getValidTimefieldSort([
        null,
        'invalid date',
        '2018-12-31T19:00:00.000Z',
        1546282800000,
      ]);
      expect('2018-12-31T19:00:00.000Z').toEqual(result);
    });
  });

  describe('getSearchParams', () => {
    it('should return search params correctly', () => {
      const result = getSearchParams(defaultProps as OnlyEsQueryAlertParams);
      expect('test-query').toBe(result.parsedQuery.query);
    });

    it('should throw invalid query error', () => {
      expect(() =>
        getSearchParams({ ...defaultProps, esQuery: '' } as OnlyEsQueryAlertParams)
      ).toThrow('invalid query specified: "" - query must be JSON');
    });

    it('should throw invalid query error due to missing query property', () => {
      expect(() =>
        getSearchParams({
          ...defaultProps,
          esQuery: '{ "someProperty": "test-query" }',
        } as OnlyEsQueryAlertParams)
      ).toThrow('invalid query specified: "{ "someProperty": "test-query" }" - query must be JSON');
    });

    it('should throw invalid window size error', () => {
      expect(() =>
        getSearchParams({
          ...defaultProps,
          timeWindowSize: 5,
          timeWindowUnit: 'r',
        } as OnlyEsQueryAlertParams)
      ).toThrow('invalid format for windowSize: "5r"');
    });
  });
});
