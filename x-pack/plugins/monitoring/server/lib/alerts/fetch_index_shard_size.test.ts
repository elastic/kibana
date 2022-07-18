/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchIndexShardSize } from './fetch_index_shard_size';

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      getKeyStoreValue: () => '*',
      config: {
        ui: {
          ccs: { enabled: true },
        },
      },
    },
  },
}));
import { Globals } from '../../static_globals';

describe('fetchIndexShardSize', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;

  const clusters = [
    {
      clusterUuid: 'cluster123',
      clusterName: 'test-cluster',
    },
  ];
  const size = 10;
  const shardIndexPatterns = '*';
  const threshold = 0.00000001;
  const esRes = {
    aggregations: {
      clusters: {
        buckets: [
          {
            key: 'NG2d5jHiSBGPE6HLlUN2Bg',
            doc_count: 60,
            index: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: '.monitoring-es-7-2022.01.27',
                  doc_count: 30,
                  hits: {
                    hits: {
                      total: {
                        value: 30,
                        relation: 'eq',
                      },
                      max_score: null,
                      hits: [
                        {
                          _index: '.monitoring-es-7-2022.01.27',
                          _id: 'JVkunX4BfK-FILsH9Wr_',
                          _score: null,
                          _source: {
                            index_stats: {
                              shards: {
                                primaries: 1,
                              },
                              primaries: {
                                store: {
                                  size_in_bytes: 3537949,
                                },
                              },
                            },
                          },
                          sort: [1643314607570],
                        },
                      ],
                    },
                  },
                },
                {
                  key: '.monitoring-kibana-7-2022.01.27',
                  doc_count: 30,
                  hits: {
                    hits: {
                      total: {
                        value: 30,
                        relation: 'eq',
                      },
                      max_score: null,
                      hits: [
                        {
                          _index: '.monitoring-es-7-2022.01.27',
                          _id: 'JFkunX4BfK-FILsH9Wr_',
                          _score: null,
                          _source: {
                            index_stats: {
                              shards: {
                                primaries: 1,
                              },
                              primaries: {
                                store: {
                                  size_in_bytes: 1017426,
                                },
                              },
                            },
                          },
                          sort: [1643314607570],
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  };
  it('fetch as expected', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      esRes
    );

    const result = await fetchIndexShardSize(
      esClient,
      clusters,
      threshold,
      shardIndexPatterns,
      size
    );
    expect(result).toEqual([
      {
        ccs: undefined,
        shardIndex: '.monitoring-es-7-2022.01.27',
        shardSize: 0,
        clusterUuid: 'NG2d5jHiSBGPE6HLlUN2Bg',
      },
      {
        ccs: undefined,
        shardIndex: '.monitoring-kibana-7-2022.01.27',
        shardSize: 0,
        clusterUuid: 'NG2d5jHiSBGPE6HLlUN2Bg',
      },
    ]);
  });
  it('should call ES with correct query', async () => {
    await fetchIndexShardSize(esClient, clusters, threshold, shardIndexPatterns, size);
    expect(esClient.search).toHaveBeenCalledWith({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.index-*,metrics-elasticsearch.index-*',
      filter_path: ['aggregations.clusters.buckets'],
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    { term: { type: 'index_stats' } },
                    { term: { 'metricset.name': 'index' } },
                    { term: { 'data_stream.dataset': 'elasticsearch.index' } },
                  ],
                  minimum_should_match: 1,
                },
              },
              { range: { timestamp: { gte: 'now-5m' } } },
            ],
          },
        },
        aggs: {
          clusters: {
            terms: { include: ['cluster123'], field: 'cluster_uuid', size: 10 },
            aggs: {
              index: {
                terms: { field: 'index_stats.index', size: 10 },
                aggs: {
                  hits: {
                    top_hits: {
                      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
                      _source: {
                        includes: [
                          '_index',
                          'index_stats.shards.primaries',
                          'index_stats.primaries.store.size_in_bytes',
                          'elasticsearch.index.shards.primaries',
                          'elasticsearch.index.primaries.store.size_in_bytes',
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
    await fetchIndexShardSize(esClient, clusters, threshold, shardIndexPatterns, size);
    // @ts-ignore
    expect(params.index).toBe('.monitoring-es-*,metrics-elasticsearch.index-*');
  });
});
