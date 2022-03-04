/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from 'src/core/server';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

import { splitAllSettledPromises } from '../utils';

import { fetchTransactionDurationCorrelationWithHistogram } from './query_correlation_with_histogram';

const params = {
  index: 'apm-*',
  start: 1577836800000,
  end: 1609459200000,
  includeFrozen: false,
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
};
const expectations = [1, 3, 5];
const ranges = [{ to: 1 }, { from: 1, to: 3 }, { from: 3, to: 5 }, { from: 5 }];
const fractions = [1, 2, 4, 5];
const totalDocCount = 1234;
const histogramRangeSteps = [1, 2, 4, 5];

const fieldValuePairs = [
  { fieldName: 'the-field-name-1', fieldValue: 'the-field-value-1' },
  { fieldName: 'the-field-name-2', fieldValue: 'the-field-value-2' },
  { fieldName: 'the-field-name-2', fieldValue: 'the-field-value-3' },
];

describe('query_correlation_with_histogram', () => {
  describe('fetchTransactionDurationCorrelationWithHistogram', () => {
    it(`doesn't break on failing ES queries and adds messages to the log`, async () => {
      const esClientSearchMock = jest.fn(
        (req: estypes.SearchRequest): Promise<estypes.SearchResponse> => {
          return Promise.resolve({} as unknown as estypes.SearchResponse);
        }
      );

      const esClientMock = {
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const { fulfilled: items, rejected: errors } = splitAllSettledPromises(
        await Promise.allSettled(
          fieldValuePairs.map((fieldValuePair) =>
            fetchTransactionDurationCorrelationWithHistogram(
              esClientMock,
              params,
              expectations,
              ranges,
              fractions,
              histogramRangeSteps,
              totalDocCount,
              fieldValuePair
            )
          )
        )
      );

      expect(items.length).toEqual(0);
      expect(esClientSearchMock).toHaveBeenCalledTimes(3);
      expect(errors.map((e) => (e as Error).toString())).toEqual([
        'Error: fetchTransactionDurationCorrelation failed, did not return aggregations.',
        'Error: fetchTransactionDurationCorrelation failed, did not return aggregations.',
        'Error: fetchTransactionDurationCorrelation failed, did not return aggregations.',
      ]);
    });

    it('returns items with correlation and ks-test value', async () => {
      const esClientSearchMock = jest.fn(
        (req: estypes.SearchRequest): Promise<estypes.SearchResponse> => {
          return Promise.resolve({
            aggregations: {
              latency_ranges: { buckets: [] },
              transaction_duration_correlation: { value: 0.6 },
              ks_test: { less: 0.001 },
              logspace_ranges: { buckets: [] },
            },
          } as unknown as estypes.SearchResponse);
        }
      );

      const esClientMock = {
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const { fulfilled: items, rejected: errors } = splitAllSettledPromises(
        await Promise.allSettled(
          fieldValuePairs.map((fieldValuePair) =>
            fetchTransactionDurationCorrelationWithHistogram(
              esClientMock,
              params,
              expectations,
              ranges,
              fractions,
              histogramRangeSteps,
              totalDocCount,
              fieldValuePair
            )
          )
        )
      );

      expect(items.length).toEqual(3);
      expect(esClientSearchMock).toHaveBeenCalledTimes(6);
      expect(errors.length).toEqual(0);
    });
  });
});
