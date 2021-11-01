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
  fetchTransactionDurationHistogramRangeSteps,
  getHistogramIntervalRequest,
} from './query_histogram_range_steps';

const params = {
  index: 'apm-*',
  start: 1577836800000,
  end: 1609459200000,
  includeFrozen: false,
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
};

describe('query_histogram_range_steps', () => {
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

  describe('fetchTransactionDurationHistogramRangeSteps', () => {
    it('fetches the range steps for the log histogram', async () => {
      const esClientSearchMock = jest.fn(
        (
          req: estypes.SearchRequest
        ): {
          body: estypes.SearchResponse;
        } => {
          return {
            body: {
              hits: { total: { value: 10 } },
              aggregations: {
                transaction_duration_max: {
                  value: 10000,
                },
                transaction_duration_min: {
                  value: 10,
                },
              },
            } as unknown as estypes.SearchResponse,
          };
        }
      );

      const esClientMock = {
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const resp = await fetchTransactionDurationHistogramRangeSteps(
        esClientMock,
        params
      );

      expect(resp.length).toEqual(100);
      expect(resp[0]).toEqual(9);
      expect(resp[99]).toEqual(18522);
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
