/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlyEsQueryRuleParams } from './types';
import { Comparator } from '../../../common/comparator_types';
import { getParsedQuery } from './util';

describe('es_query utils', () => {
  const defaultProps = {
    size: 3,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [],
    thresholdComparator: '>=' as Comparator,
    esQuery: '{ "query": "test-query" }',
    index: ['test-index'],
    timeField: '',
    searchType: 'esQuery',
    excludeHitsFromPreviousRun: true,
    aggType: 'count',
    groupBy: 'all',
    searchConfiguration: {},
    esqlQuery: { esql: 'test-query' },
  };

  describe('getParsedQuery', () => {
    it('should return search params correctly', () => {
      const parsedQuery = getParsedQuery(defaultProps as OnlyEsQueryRuleParams);
      expect(parsedQuery.query).toBe('test-query');
    });

    it('should throw invalid query error', () => {
      expect(() =>
        getParsedQuery({ ...defaultProps, esQuery: '' } as OnlyEsQueryRuleParams)
      ).toThrow('invalid query specified: "" - query must be JSON');
    });

    it('should throw invalid query error due to missing query property', () => {
      expect(() =>
        getParsedQuery({
          ...defaultProps,
          esQuery: '{ "someProperty": "test-query" }',
        } as OnlyEsQueryRuleParams)
      ).toThrow('invalid query specified: "{ "someProperty": "test-query" }" - query must be JSON');
    });
  });
});
