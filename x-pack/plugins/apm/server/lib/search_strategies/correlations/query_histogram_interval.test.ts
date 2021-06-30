/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHistogramIntervalRequest } from './query_histogram_interval';

describe('query_histogram_interval', () => {
  describe('getHistogramIntervalRequest()', () => {
    it('returns the request body for the transaction duration ranges aggregation', () => {
      const req = getHistogramIntervalRequest({ index: 'apm-*' });

      expect(req).toEqual({
        body: {
          aggs: {
            transaction_duration_max: {
              max: {
                field: 'transaction.duration.us',
              },
            },
            transaction_duration_min: {
              min: {
                field: 'transaction.duration.us',
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
