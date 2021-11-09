/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

import {
  fetchTransactionDurationHistogram,
  getTransactionDurationHistogramRequest,
} from './query_histogram';

const params = {
  index: 'apm-*',
  start: 1577836800000,
  end: 1609459200000,
  includeFrozen: false,
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
};
const interval = 100;

describe('query_histogram', () => {
  describe('getTransactionDurationHistogramRequest', () => {
    it('returns the request body for the histogram request', () => {
      const req = getTransactionDurationHistogramRequest(params, interval);

      expect(req).toEqual({
        body: {
          aggs: {
            transaction_duration_histogram: {
              histogram: {
                field: 'transaction.duration.us',
                interval,
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
                {
                  range: {
                    '@timestamp': {
                      format: 'epoch_millis',
                      gte: 1577836800000,
                      lte: 1609459200000,
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        index: params.index,
        ignore_throttled: !params.includeFrozen,
        ignore_unavailable: true,
      });
    });
  });

  describe('fetchTransactionDurationHistogram', () => {
    it('returns the buckets from the histogram aggregation', async () => {
      const histogramBucket = [
        {
          key: 0.0,
          doc_count: 1,
        },
      ];

      const esClientSearchMock = jest.fn(
        (
          req: estypes.SearchRequest
        ): {
          body: estypes.SearchResponse;
        } => {
          return {
            body: {
              aggregations: {
                transaction_duration_histogram: {
                  buckets: histogramBucket,
                },
              },
            } as unknown as estypes.SearchResponse,
          };
        }
      );

      const esClientMock = {
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const resp = await fetchTransactionDurationHistogram(
        esClientMock,
        params,
        interval
      );

      expect(resp).toEqual(histogramBucket);
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
