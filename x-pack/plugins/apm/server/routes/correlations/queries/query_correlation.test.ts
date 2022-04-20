/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

import {
  fetchTransactionDurationCorrelation,
  getTransactionDurationCorrelationRequest,
  BucketCorrelation,
} from './query_correlation';

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

describe('query_correlation', () => {
  describe('getTransactionDurationCorrelationRequest', () => {
    it('applies options to the returned query with aggregations for correlations and k-test', () => {
      const query = getTransactionDurationCorrelationRequest(
        params,
        expectations,
        ranges,
        fractions,
        totalDocCount
      );

      expect(query.index).toBe(params.index);

      expect(query?.body?.aggs?.latency_ranges?.range?.field).toBe(
        'transaction.duration.us'
      );
      expect(query?.body?.aggs?.latency_ranges?.range?.ranges).toEqual(ranges);

      expect(
        (
          query?.body?.aggs?.transaction_duration_correlation as {
            bucket_correlation: BucketCorrelation;
          }
        )?.bucket_correlation.function.count_correlation.indicator
      ).toEqual({
        fractions,
        expectations,
        doc_count: totalDocCount,
      });

      expect(
        (query?.body?.aggs?.ks_test as any)?.bucket_count_ks_test?.fractions
      ).toEqual(fractions);
    });
  });

  describe('fetchTransactionDurationCorrelation', () => {
    it('returns the data from the aggregations', async () => {
      const latencyRangesBuckets = [{ to: 1 }, { from: 1, to: 2 }, { from: 2 }];
      const transactionDurationCorrelationValue = 0.45;
      const KsTestLess = 0.01;

      const esClientSearchMock = jest.fn(
        (req: estypes.SearchRequest): estypes.SearchResponse => {
          return {
            aggregations: {
              latency_ranges: {
                buckets: latencyRangesBuckets,
              },
              transaction_duration_correlation: {
                value: transactionDurationCorrelationValue,
              },
              ks_test: { less: KsTestLess },
            },
          } as unknown as estypes.SearchResponse;
        }
      );

      const esClientMock = {
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const resp = await fetchTransactionDurationCorrelation(
        esClientMock,
        params,
        expectations,
        ranges,
        fractions,
        totalDocCount
      );

      expect(resp).toEqual({
        correlation: transactionDurationCorrelationValue,
        ksTest: KsTestLess,
        ranges: latencyRangesBuckets,
      });
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
