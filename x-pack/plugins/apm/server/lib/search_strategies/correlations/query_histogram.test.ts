/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransactionDurationHistogramRequest } from './query_histogram';

describe('query_histogram', () => {
  describe('getHistogramIntervalRequest()', () => {
    it('returns the request body for the histogram request', () => {
      const req = getTransactionDurationHistogramRequest(
        { index: 'apm-*' },
        100
      );

      expect(req).toEqual({
        body: {
          aggs: {
            transaction_duration_histogram: {
              histogram: {
                field: 'transaction.duration.us',
                interval: 100,
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  term: {
                    'processor.event': 'transaction',
                  },
                },
              ],
            },
          },
          size: 0,
        },
        index: 'apm-*',
      });
    });
  });
});
