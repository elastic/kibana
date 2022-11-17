/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { fetchCCRReadExceptions } from './fetch_ccr_read_exceptions';
import { Globals } from '../../static_globals';
import type { estypes } from '@elastic/elasticsearch';

const getConfig = (ccsEnabled: boolean) =>
  ({
    config: {
      ui: {
        ccs: { enabled: ccsEnabled },
      },
    },
  } as Partial<typeof Globals.app> as typeof Globals.app);

describe('fetchCCReadExceptions', () => {
  const esRes: estypes.SearchResponse = {
    took: 1,
    timed_out: false,
    _shards: {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: 0,
      max_score: 0,
      hits: [],
    },
    aggregations: {
      remote_clusters: {
        buckets: [
          {
            key: 'remote',
            doc_count: 1032,
            follower_indices: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'follower2',
                  doc_count: 645,
                  hits: {
                    hits: {
                      total: {
                        value: 645,
                        relation: 'eq',
                      },
                      max_score: null,
                      hits: [
                        {
                          _index: 'remote:.ds-.monitoring-es-8-mb-2022.11.17-000001',
                          _id: 'ttnihYQBstwhXuwb-qvp',
                          _score: null,
                          _source: {
                            elasticsearch: {
                              ccr: {
                                shard_id: 12345,
                                read_exceptions: [
                                  {
                                    exception: {
                                      type: 'error',
                                      reason: 'error',
                                    },
                                  },
                                ],
                                leader: {
                                  index: 'leader2',
                                },
                              },
                              cluster: {
                                id: 'vX4lH4C6QmyrJeYrvKr0-A',
                              },
                            },
                          },
                          sort: [1668628860440],
                        },
                      ],
                    },
                  },
                },
                {
                  key: 'follower',
                  doc_count: 387,
                  hits: {
                    hits: {
                      total: {
                        value: 387,
                        relation: 'eq',
                      },
                      max_score: null,
                      hits: [
                        {
                          _index: 'remote:.ds-.monitoring-es-8-mb-2022.11.17-000001',
                          _id: 't9nihYQBstwhXuwb-qvp',
                          _score: null,
                          _source: {
                            elasticsearch: {
                              ccr: {
                                shard_id: 12345,
                                read_exceptions: [
                                  {
                                    exception: {
                                      type: 'error',
                                      reason: 'error',
                                    },
                                  },
                                ],
                                leader: {
                                  index: 'leader',
                                },
                              },
                              cluster: {
                                id: 'vX4lH4C6QmyrJeYrvKr0-A',
                              },
                            },
                          },
                          sort: [1668628860440],
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
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  esClient.search.mockResponse(esRes);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Globals, 'app', 'get').mockReturnValue(getConfig(true));
  });

  it('should call ES with correct query', async () => {
    await fetchCCRReadExceptions(esClient, 1643306331418, 1643309869056, 10000);
    expect(esClient.search).toHaveBeenCalledWith({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.stack_monitoring.ccr-*,metrics-elasticsearch.stack_monitoring.ccr-*',
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
                    { term: { 'data_stream.dataset': 'elasticsearch.stack_monitoring.ccr' } },
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
    jest.spyOn(Globals, 'app', 'get').mockReturnValue(getConfig(false));
    let params: estypes.SearchRequest | undefined;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes);
    });

    await fetchCCRReadExceptions(esClient, 1643306331418, 1643309869056, 10000);
    expect(params?.index).toBe('.monitoring-es-*,metrics-elasticsearch.stack_monitoring.ccr-*');
  });

  it('should return CCR exceptions', async () => {
    const exceptions = await fetchCCRReadExceptions(esClient, 1643306331418, 1643309869056, 10000);
    expect(exceptions).toEqual([
      {
        clusterUuid: 'vX4lH4C6QmyrJeYrvKr0-A',
        remoteCluster: 'remote',
        followerIndex: 'follower2',
        shardId: 12345,
        leaderIndex: 'leader2',
        lastReadException: { type: 'error', reason: 'error' },
        ccs: 'remote',
      },
      {
        clusterUuid: 'vX4lH4C6QmyrJeYrvKr0-A',
        remoteCluster: 'remote',
        followerIndex: 'follower',
        shardId: 12345,
        leaderIndex: 'leader',
        lastReadException: { type: 'error', reason: 'error' },
        ccs: 'remote',
      },
    ]);
  });
});
