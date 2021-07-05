/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import {
  fetchTransactionDurationPercentiles,
  getTransactionDurationPercentilesRequest,
} from './query_percentiles';

const params = { index: 'apm-*' };

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
              ],
            },
          },
          size: 0,
        },
        index: params.index,
      });
    });
  });

  describe('fetchTransactionDurationPercentiles', () => {
    it('fetches the percentiles', async () => {
      const percentilesValues = {
        '1.0': 5.0,
        '5.0': 25.0,
        '25.0': 165.0,
        '50.0': 445.0,
        '75.0': 725.0,
        '95.0': 945.0,
        '99.0': 985.0,
      };

      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): {
        body: estypes.SearchResponse;
      } => {
        return {
          body: ({
            aggregations: {
              transaction_duration_percentiles: {
                values: percentilesValues,
              },
            },
          } as unknown) as estypes.SearchResponse,
        };
      });

      const esClientMock = ({
        search: esClientSearchMock,
      } as unknown) as ElasticsearchClient;

      const resp = await fetchTransactionDurationPercentiles(
        esClientMock,
        params
      );

      expect(resp).toEqual(percentilesValues);
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
