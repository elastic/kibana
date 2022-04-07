/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { fetchCCRReadExceptions } from './fetch_ccr_read_exceptions';

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          ccs: { enabled: true, remotePatterns: '*' },
        },
      },
    },
  },
}));
import { Globals } from '../../static_globals';

describe('fetchCCReadExceptions', () => {
  const esRes = {
    aggregations: {
      remote_clusters: {
        buckets: [],
      },
    },
  };
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  esClient.search.mockResponse(
    // @ts-expect-error not full response interface
    esRes
  );
  it('should call ES with correct query', async () => {
    await fetchCCRReadExceptions(esClient, 1643306331418, 1643309869056, 10000);
    expect(esClient.search).toHaveBeenCalledWith({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.ccr-*,metrics-elasticsearch.ccr-*',
      filter_path: ['aggregations.remote_clusters.buckets'],
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      nested: {
                        ignore_unmapped: true,
                        path: 'ccr_stats.read_exceptions',
                        query: {
                          exists: {
                            field: 'ccr_stats.read_exceptions.exception',
                          },
                        },
                      },
                    },
                    {
                      nested: {
                        ignore_unmapped: true,
                        path: 'elasticsearch.ccr.read_exceptions',
                        query: {
                          exists: {
                            field: 'elasticsearch.ccr.read_exceptions.exception',
                          },
                        },
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    { term: { type: 'ccr_stats' } },
                    { term: { 'metricset.name': 'ccr' } },
                    { term: { 'data_stream.dataset': 'elasticsearch.ccr' } },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                range: {
                  timestamp: { format: 'epoch_millis', gte: 1643306331418, lte: 1643309869056 },
                },
              },
            ],
          },
        },
        aggs: {
          remote_clusters: {
            terms: { field: 'ccr_stats.remote_cluster', size: 10000 },
            aggs: {
              follower_indices: {
                terms: { field: 'ccr_stats.follower_index', size: 10000 },
                aggs: {
                  hits: {
                    top_hits: {
                      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
                      _source: {
                        includes: [
                          'cluster_uuid',
                          'elasticsearch.cluster.id',
                          'ccr_stats.read_exceptions',
                          'elasticsearch.ccr.read_exceptions',
                          'ccr_stats.shard_id',
                          'elasticsearch.ccr.shard_id',
                          'ccr_stats.leader_index',
                          'elasticsearch.ccr.leader.index',
                        ],
                      },
                      size: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
  it('should call ES with correct query when ccs disabled', async () => {
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = false;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes as any);
    });

    await fetchCCRReadExceptions(esClient, 1643306331418, 1643309869056, 10000);

    // @ts-ignore
    expect(params.index).toBe('.monitoring-es-*,metrics-elasticsearch.ccr-*');
  });
});
