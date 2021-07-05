/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import {
  fetchTransactionDurationRanges,
  getTransactionDurationRangesRequest,
} from './query_ranges';

const params = { index: 'apm-*' };
const rangeSteps = [1, 3, 5];

describe('query_ranges', () => {
  describe('getTransactionDurationRangesRequest', () => {
    it('returns the request body for the duration percentiles request', () => {
      const req = getTransactionDurationRangesRequest(params, rangeSteps);

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
        index: params.index,
      });
    });
  });

  describe('fetchTransactionDurationRanges', () => {
    it('fetches the percentiles', async () => {
      const logspaceRangesBuckets = [
        {
          key: '*-100.0',
          to: 100.0,
          doc_count: 2,
        },
        {
          key: '100.0-200.0',
          from: 100.0,
          to: 200.0,
          doc_count: 2,
        },
        {
          key: '200.0-*',
          from: 200.0,
          doc_count: 3,
        },
      ];

      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): {
        body: estypes.SearchResponse;
      } => {
        return {
          body: ({
            aggregations: {
              logspace_ranges: {
                buckets: logspaceRangesBuckets,
              },
            },
          } as unknown) as estypes.SearchResponse,
        };
      });

      const esClientMock = ({
        search: esClientSearchMock,
      } as unknown) as ElasticsearchClient;

      const resp = await fetchTransactionDurationRanges(
        esClientMock,
        params,
        rangeSteps
      );

      expect(resp).toEqual([
        { doc_count: 2, key: 100 },
        { doc_count: 3, key: 200 },
      ]);
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
