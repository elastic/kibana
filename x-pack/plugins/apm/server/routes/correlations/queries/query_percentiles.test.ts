/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

import {
  fetchTransactionDurationPercentiles,
  getTransactionDurationPercentilesRequest,
} from './query_percentiles';

const params = {
  index: 'apm-*',
  start: 1577836800000,
  end: 1609459200000,
  includeFrozen: false,
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
};

describe('query_percentiles', () => {
  describe('getTransactionDurationPercentilesRequest', () => {
    it('returns the request body for the duration percentiles request', () => {
      const req = getTransactionDurationPercentilesRequest(params);

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
          track_total_hits: true,
        },
        index: params.index,
        ignore_throttled: params.includeFrozen ? false : undefined,
        ignore_unavailable: true,
      });
    });
  });

  describe('fetchTransactionDurationPercentiles', () => {
    it('fetches the percentiles', async () => {
      const totalDocs = 10;
      const percentilesValues = {
        '1.0': 5.0,
        '5.0': 25.0,
        '25.0': 165.0,
        '50.0': 445.0,
        '75.0': 725.0,
        '95.0': 945.0,
        '99.0': 985.0,
      };

      const esClientSearchMock = jest.fn(
        (req: estypes.SearchRequest): estypes.SearchResponse => {
          return {
            hits: { total: { value: totalDocs } },
            aggregations: {
              transaction_duration_percentiles: {
                values: percentilesValues,
              },
            },
          } as unknown as estypes.SearchResponse;
        }
      );
      const esClientMock = {
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const resp = await fetchTransactionDurationPercentiles(
        esClientMock,
        params
      );

      expect(resp).toEqual({ percentiles: percentilesValues, totalDocs });
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
