/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import {
  fetchTransactionDurationFractions,
  getTransactionDurationRangesRequest,
} from './query_fractions';

const params = { index: 'apm-*', start: '2020', end: '2021' };
const ranges = [{ to: 1 }, { from: 1, to: 3 }, { from: 3, to: 5 }, { from: 5 }];

describe('query_fractions', () => {
  describe('getTransactionDurationRangesRequest', () => {
    it('returns the request body for the transaction duration ranges aggregation', () => {
      const req = getTransactionDurationRangesRequest(params, ranges);

      expect(req?.body?.aggs?.latency_ranges?.range?.field).toBe(
        'transaction.duration.us'
      );
      expect(req?.body?.aggs?.latency_ranges?.range?.ranges).toEqual(ranges);
    });
  });

  describe('fetchTransactionDurationFractions', () => {
    it('computes the actual percentile bucket counts and actual fractions', async () => {
      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): {
        body: estypes.SearchResponse;
      } => {
        return {
          body: ({
            aggregations: {
              latency_ranges: {
                buckets: [{ doc_count: 1 }, { doc_count: 2 }],
              },
            },
          } as unknown) as estypes.SearchResponse,
        };
      });

      const esClientMock = ({
        search: esClientSearchMock,
      } as unknown) as ElasticsearchClient;

      const resp = await fetchTransactionDurationFractions(
        esClientMock,
        params,
        ranges
      );

      expect(resp).toEqual({
        fractions: [0.3333333333333333, 0.6666666666666666],
        totalDocCount: 3,
      });
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
