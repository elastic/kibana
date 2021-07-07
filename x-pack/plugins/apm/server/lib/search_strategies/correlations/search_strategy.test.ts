/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { SearchStrategyDependencies } from 'src/plugins/data/server';

import {
  apmCorrelationsSearchStrategyProvider,
  PartialSearchRequest,
} from './search_strategy';

// helper to trigger promises in the async search service
const flushPromises = () => new Promise(setImmediate);

const clientFieldCapsMock = () => ({ body: { fields: [] } });

// minimal client mock to fulfill search requirements of the async search service to succeed
const clientSearchMock = (
  req: estypes.SearchRequest
): { body: estypes.SearchResponse } => {
  let aggregations:
    | {
        transaction_duration_percentiles: estypes.AggregationsTDigestPercentilesAggregate;
      }
    | {
        transaction_duration_min: estypes.AggregationsValueAggregate;
        transaction_duration_max: estypes.AggregationsValueAggregate;
      }
    | {
        logspace_ranges: estypes.AggregationsMultiBucketAggregate<{
          from: number;
          doc_count: number;
        }>;
      }
    | {
        latency_ranges: estypes.AggregationsMultiBucketAggregate<{
          doc_count: number;
        }>;
      }
    | undefined;

  if (req?.body?.aggs !== undefined) {
    const aggs = req.body.aggs;
    // fetchTransactionDurationPercentiles
    if (aggs.transaction_duration_percentiles !== undefined) {
      aggregations = { transaction_duration_percentiles: { values: {} } };
    }

    // fetchTransactionDurationHistogramInterval
    if (
      aggs.transaction_duration_min !== undefined &&
      aggs.transaction_duration_max !== undefined
    ) {
      aggregations = {
        transaction_duration_min: { value: 0 },
        transaction_duration_max: { value: 1234 },
      };
    }

    // fetchTransactionDurationCorrelation
    if (aggs.logspace_ranges !== undefined) {
      aggregations = { logspace_ranges: { buckets: [] } };
    }

    // fetchTransactionDurationFractions
    if (aggs.latency_ranges !== undefined) {
      aggregations = { latency_ranges: { buckets: [] } };
    }
  }

  return {
    body: {
      _shards: {
        failed: 0,
        successful: 1,
        total: 1,
      },
      took: 162,
      timed_out: false,
      hits: {
        hits: [],
        total: {
          value: 0,
          relation: 'eq',
        },
      },
      ...(aggregations !== undefined ? { aggregations } : {}),
    },
  };
};

describe('APM Correlations search strategy', () => {
  describe('strategy interface', () => {
    it('returns a custom search strategy with a `search` and `cancel` function', async () => {
      const searchStrategy = await apmCorrelationsSearchStrategyProvider();
      expect(typeof searchStrategy.search).toBe('function');
      expect(typeof searchStrategy.cancel).toBe('function');
    });
  });

  describe('search', () => {
    let mockClientFieldCaps: jest.Mock;
    let mockClientSearch: jest.Mock;
    let mockDeps: SearchStrategyDependencies;
    let params: Required<PartialSearchRequest>['params'];

    beforeEach(() => {
      mockClientFieldCaps = jest.fn(clientFieldCapsMock);
      mockClientSearch = jest.fn(clientSearchMock);
      mockDeps = ({
        esClient: {
          asCurrentUser: {
            fieldCaps: mockClientFieldCaps,
            search: mockClientSearch,
          },
        },
      } as unknown) as SearchStrategyDependencies;
      params = {
        index: 'apm-*',
      };
    });

    describe('async functionality', () => {
      describe('when no params are provided', () => {
        it('throws an error', async () => {
          const searchStrategy = await apmCorrelationsSearchStrategyProvider();
          expect(() => searchStrategy.search({}, {}, mockDeps)).toThrow(
            'Invalid request parameters.'
          );
        });
      });

      describe('when no ID is provided', () => {
        it('performs a client search with params', async () => {
          const searchStrategy = await apmCorrelationsSearchStrategyProvider();
          await searchStrategy.search({ params }, {}, mockDeps).toPromise();
          const [[request]] = mockClientSearch.mock.calls;

          expect(request.index).toEqual('apm-*');
          expect(request.body).toEqual(
            expect.objectContaining({
              aggs: {
                transaction_duration_percentiles: {
                  percentiles: {
                    field: 'transaction.duration.us',
                    hdr: { number_of_significant_value_digits: 3 },
                  },
                },
              },
              query: {
                bool: {
                  filter: [{ term: { 'processor.event': 'transaction' } }],
                },
              },
              size: 0,
            })
          );
        });
      });

      describe('when an ID with params is provided', () => {
        it('retrieves the current request', async () => {
          const searchStrategy = await apmCorrelationsSearchStrategyProvider();
          const response = await searchStrategy
            .search({ id: 'my-search-id', params }, {}, mockDeps)
            .toPromise();

          expect(response).toEqual(
            expect.objectContaining({ id: 'my-search-id' })
          );
        });
      });

      describe('if the client throws', () => {
        it('does not emit an error', async () => {
          mockClientSearch
            .mockReset()
            .mockRejectedValueOnce(new Error('client error'));
          const searchStrategy = await apmCorrelationsSearchStrategyProvider();
          const response = await searchStrategy
            .search({ params }, {}, mockDeps)
            .toPromise();

          expect(response).toEqual(
            expect.objectContaining({ isRunning: true })
          );
        });
      });

      it('triggers the subscription only once', async () => {
        expect.assertions(1);
        const searchStrategy = await apmCorrelationsSearchStrategyProvider();
        searchStrategy
          .search({ params }, {}, mockDeps)
          .subscribe((response) => {
            expect(response).toEqual(
              expect.objectContaining({ loaded: 0, isRunning: true })
            );
          });
      });
    });

    describe('response', () => {
      it('sends an updated response on consecutive search calls', async () => {
        const searchStrategy = await apmCorrelationsSearchStrategyProvider();

        const response1 = await searchStrategy
          .search({ params }, {}, mockDeps)
          .toPromise();

        expect(typeof response1.id).toEqual('string');
        expect(response1).toEqual(
          expect.objectContaining({ loaded: 0, isRunning: true })
        );

        await flushPromises();

        const response2 = await searchStrategy
          .search({ id: response1.id, params }, {}, mockDeps)
          .toPromise();

        expect(response2.id).toEqual(response1.id);
        expect(response2).toEqual(
          expect.objectContaining({ loaded: 10, isRunning: false })
        );
      });
    });
  });
});
