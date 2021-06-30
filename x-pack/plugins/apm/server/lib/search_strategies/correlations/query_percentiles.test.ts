/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransactionDurationPercentilesRequest } from './query_percentiles';

describe('query_percentiles', () => {
  describe('getTransactionDurationPercentilesRequest()', () => {
    it('returns the request body for the duration percentiles request', () => {
      const req = getTransactionDurationPercentilesRequest({ index: 'apm-*' });

      expect(req).toEqual({
        body: {
          aggs: {
            transaction_duration_percentiles: {
              percentiles: {
                field: 'transaction.duration.us',
                hdr: {
                  number_of_significant_value_digits: 3,
                },
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
