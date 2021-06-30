/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransactionDurationRangesRequest } from './query_fractions';

describe('query_fractions', () => {
  describe('getTransactionDurationRangesRequest()', () => {
    it('returns the request body for the transaction duration ranges aggregation', () => {
      const ranges = [
        { to: 1 },
        { from: 1, to: 3 },
        { from: 3, to: 5 },
        { from: 5 },
      ];

      const req = getTransactionDurationRangesRequest(
        { index: 'apm-*' },
        ranges
      );

      expect(req?.body?.aggs?.latency_ranges?.range?.field).toBe(
        'transaction.duration.us'
      );
      expect(req?.body?.aggs?.latency_ranges?.range?.ranges).toEqual(ranges);
    });
  });
});
