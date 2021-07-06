/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import {
  fetchTransactionDurationHistogramInterval,
  getHistogramIntervalRequest,
} from './query_histogram_interval';

const params = { index: 'apm-*' };

describe('query_histogram_interval', () => {
  describe('getHistogramIntervalRequest', () => {
    it('returns the request body for the transaction duration ranges aggregation', () => {
      const req = getHistogramIntervalRequest(params);

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
        index: params.index,
      });
    });
  });

  describe('fetchTransactionDurationHistogramInterval', () => {
    it('fetches the interval duration for histograms', async () => {
      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): {
        body: estypes.SearchResponse;
      } => {
        return {
          body: ({
            aggregations: {
              transaction_duration_max: {
                value: 10000,
              },
              transaction_duration_min: {
                value: 10,
              },
            },
          } as unknown) as estypes.SearchResponse,
        };
      });

      const esClientMock = ({
        search: esClientSearchMock,
      } as unknown) as ElasticsearchClient;

      const resp = await fetchTransactionDurationHistogramInterval(
        esClientMock,
        params
      );

      expect(resp).toEqual(10);
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
