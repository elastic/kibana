/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { fetchNodesFromClusterStats } from './fetch_nodes_from_cluster_stats';

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

describe('fetchNodesFromClusterStats', () => {
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const clusters = [
    {
      clusterUuid: 'NG2d5jHiSBGPE6HLlUN2Bg',
      clusterName: 'elasticsearch',
    },
  ];

  const esRes = {
    aggregations: {
      clusters: {
        buckets: [
          {
            key: 'NG2d5jHiSBGPE6HLlUN2Bg',
            doc_count: 12,
            top: {
              hits: {
                total: { value: 12, relation: 'eq' },
                max_score: null,
                hits: [
                  {
                    _index: '.monitoring-es-7-2022.01.27',
                    _id: 'IlmvnX4BfK-FILsH34eS',
                    _score: null,
                    _source: {
                      cluster_state: {
                        nodes_hash: 858284333,
                        nodes: {
                          qrLmmSBMSXGSfciYLjL3GA: {
                            transport_address: '127.0.0.1:9300',
                            roles: [
                              'data',
                              'data_cold',
                              'data_content',
                              'data_frozen',
                              'data_hot',
                              'data_warm',
                              'ingest',
                              'master',
                              'ml',
                              'remote_cluster_client',
                              'transform',
                            ],
                            name: 'desktop-dca-192-168-162-170.endgames.local',
                            attributes: {
                              'ml.machine_memory': '34359738368',
                              'xpack.installed': 'true',
                              'ml.max_jvm_size': '1610612736',
                            },
                            ephemeral_id: 'cCXPWB3nSoKkl_m_q2nPFQ',
                          },
                        },
                      },
                    },
                    sort: [1643323056014],
                  },
                  {
                    _index: '.monitoring-es-7-2022.01.27',
                    _id: 'GVmvnX4BfK-FILsHuIeF',
                    _score: null,
                    _source: {
                      cluster_state: {
                        nodes_hash: 858284333,
                        nodes: {
                          qrLmmSBMSXGSfciYLjL3GA: {
                            transport_address: '127.0.0.1:9300',
                            roles: [
                              'data',
                              'data_cold',
                              'data_content',
                              'data_frozen',
                              'data_hot',
                              'data_warm',
                              'ingest',
                              'master',
                              'ml',
                              'remote_cluster_client',
                              'transform',
                            ],
                            name: 'desktop-dca-192-168-162-170.endgames.local',
                            attributes: {
                              'ml.machine_memory': '34359738368',
                              'xpack.installed': 'true',
                              'ml.max_jvm_size': '1610612736',
                            },
                            ephemeral_id: 'cCXPWB3nSoKkl_m_q2nPFQ',
                          },
                        },
                      },
                    },
                    sort: [1643323046019],
                  },
                ],
              },
            },
          },
        ],
      },
    },
  };

  it('fetch stats', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      esRes
    );
    const result = await fetchNodesFromClusterStats(esClient, clusters);
    expect(result).toEqual([
      {
        clusterUuid: 'NG2d5jHiSBGPE6HLlUN2Bg',
        recentNodes: [
          {
            nodeUuid: 'qrLmmSBMSXGSfciYLjL3GA',
            nodeEphemeralId: 'cCXPWB3nSoKkl_m_q2nPFQ',
            nodeName: 'desktop-dca-192-168-162-170.endgames.local',
          },
        ],
        priorNodes: [
          {
            nodeUuid: 'qrLmmSBMSXGSfciYLjL3GA',
            nodeEphemeralId: 'cCXPWB3nSoKkl_m_q2nPFQ',
            nodeName: 'desktop-dca-192-168-162-170.endgames.local',
          },
        ],
      },
    ]);
  });

  it('should call ES with correct query', async () => {
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes as any);
    });
    await fetchNodesFromClusterStats(esClient, clusters);
    expect(params).toStrictEqual({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.cluster_stats-*,metrics-elasticsearch.cluster_stats-*',
      filter_path: ['aggregations.clusters.buckets'],
      body: {
        size: 0,
        sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    { term: { type: 'cluster_stats' } },
                    { term: { 'metricset.name': 'cluster_stats' } },
                    { term: { 'data_stream.dataset': 'elasticsearch.cluster_stats' } },
                  ],
                  minimum_should_match: 1,
                },
              },
              { range: { timestamp: { gte: 'now-2m' } } },
            ],
          },
        },
        aggs: {
          clusters: {
            terms: { include: ['NG2d5jHiSBGPE6HLlUN2Bg'], field: 'cluster_uuid' },
            aggs: {
              top: {
                top_hits: {
                  sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
                  _source: {
                    includes: ['cluster_state.nodes', 'elasticsearch.cluster.stats.nodes'],
                  },
                  size: 2,
                },
              },
            },
          },
        },
      },
    });
  });
  it('should call ES with correct query  when ccs disabled', async () => {
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = false;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes as any);
    });
    await fetchNodesFromClusterStats(esClient, clusters);
    // @ts-ignore
    expect(params.index).toBe('.monitoring-es-*,metrics-elasticsearch.cluster_stats-*');
  });
});
