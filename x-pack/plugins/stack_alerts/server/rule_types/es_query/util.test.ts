/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlyEsQueryRuleParams } from './types';
import { Comparator } from '../../../common/comparator_types';
import { getParsedQuery, parseShardFailures } from './util';

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

  describe('parseShardFailures', () => {
    it('should throw error if any failures in the shard response', () => {
      expect(() =>
        parseShardFailures({
          took: 16,
          timed_out: false,
          _shards: {
            total: 51,
            successful: 48,
            skipped: 48,
            failed: 3,
            failures: [
              {
                shard: 0,
                index: 'ccs-index',
                node: '8jMc8jz-Q6qFmKZXfijt-A',
                reason: {
                  type: 'illegal_argument_exception',
                  reason:
                    "Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.",
                },
              },
            ],
          },
          hits: {
            total: {
              value: 0,
              relation: 'eq',
            },
            max_score: 0,
            hits: [],
          },
        })
      ).toThrow(
        `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
      );
    });

    it('should throw error with default error message if malformed error', () => {
      expect(() =>
        parseShardFailures({
          took: 16,
          timed_out: false,
          _shards: {
            total: 51,
            successful: 48,
            skipped: 48,
            failed: 3,
            failures: [
              // @ts-expect-error
              {
                shard: 0,
                index: 'ccs-index',
                node: '8jMc8jz-Q6qFmKZXfijt-A',
              },
            ],
          },
          hits: {
            total: {
              value: 0,
              relation: 'eq',
            },
            max_score: 0,
            hits: [],
          },
        })
      ).toThrow(`Search failed due shard exception.`);

      expect(() =>
        parseShardFailures({
          took: 16,
          timed_out: false,
          _shards: { total: 51, successful: 48, skipped: 48, failed: 3, failures: [] },
          hits: {
            total: {
              value: 0,
              relation: 'eq',
            },
            max_score: 0,
            hits: [],
          },
        })
      ).toThrow(`Search failed due shard exception.`);
    });

    it('should not throw error if no failures', () => {
      expect(
        parseShardFailures({
          took: 16,
          timed_out: false,
          _shards: { total: 51, successful: 51, skipped: 51, failed: 0, failures: [] },
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        })
      ).toBeUndefined();
    });
  });
});
