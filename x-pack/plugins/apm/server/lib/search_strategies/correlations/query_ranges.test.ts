/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransactionDurationRangesRequest } from './query_ranges';

describe('query_ranges', () => {
  describe('getTransactionDurationRangesRequest()', () => {
    it('returns the request body for the duration percentiles request', () => {
      const rangeSteps = [1, 3, 5];

      const req = getTransactionDurationRangesRequest(
        { index: 'apm-*' },
        rangeSteps
      );

      expect(req).toEqual({
        body: {
          aggs: {
            logspace_ranges: {
              range: {
                field: 'transaction.duration.us',
                ranges: [
                  {
                    to: 0,
                  },
                  {
                    from: 0,
                    to: 1,
                  },
                  {
                    from: 1,
                    to: 3,
                  },
                  {
                    from: 3,
                    to: 5,
                  },
                  {
                    from: 5,
                  },
                ],
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
