/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import {
  fetchTransactionDurationHistogramRangesteps,
  getHistogramIntervalRequest,
} from './query_histogram_rangesteps';

const params = { index: 'apm-*' };

describe('query_histogram_rangesteps', () => {
  describe('getHistogramIntervalRequest', () => {
    it('returns the request body for the histogram interval request', () => {
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

  describe('fetchTransactionDurationHistogramRangesteps', () => {
    it('fetches the range steps for the log histogram', async () => {
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

      const resp = await fetchTransactionDurationHistogramRangesteps(
        esClientMock,
        params
      );

      expect(resp.length).toEqual(100);
      expect(resp[0]).toEqual(9.260965422132594);
      expect(resp[99]).toEqual(18521.930844265193);
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
