/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getTransactionDurationCorrelationRequest,
  BucketCorrelation,
} from './query_correlation';

describe('query_correlation', () => {
  describe('getTransactionDurationCorrelationRequest()', () => {
    it('applies options to the returned query with aggregations for correlations and k-test', () => {
      const index = 'apm-*';
      const expectations = [1, 3, 5];
      const ranges = [
        { to: 1 },
        { from: 1, to: 3 },
        { from: 3, to: 5 },
        { from: 5 },
      ];
      const fractions = [1, 2, 4, 5];
      const totalDocCount = 1234;

      const query = getTransactionDurationCorrelationRequest(
        { index },
        expectations,
        ranges,
        fractions,
        totalDocCount
      );

      expect(query.index).toBe(index);

      expect(query?.body?.aggs?.latency_ranges?.range?.field).toBe(
        'transaction.duration.us'
      );
      expect(query?.body?.aggs?.latency_ranges?.range?.ranges).toEqual(ranges);

      expect(
        (query?.body?.aggs?.transaction_duration_correlation as {
          bucket_correlation: BucketCorrelation;
        })?.bucket_correlation.function.count_correlation.indicator
      ).toEqual({
        fractions,
        expectations,
        doc_count: totalDocCount,
      });

      expect(
        (query?.body?.aggs?.ks_test as any)?.bucket_count_ks_test?.fractions
      ).toEqual([0, ...fractions]);
    });
  });
});
