/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { fetchNodesFromClusterStats } from './fetch_nodes_from_cluster_stats';
import { Globals } from '../../static_globals';
import type { estypes } from '@elastic/elasticsearch';

const esMetricbeatRes: estypes.SearchResponse = {
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
    clusters: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 473,
      buckets: [
        {
          key: 'NG2d5jHiSBGPE6HLlUN2Bg',
          doc_count: 12,
          top: {
            hits: {
              total: {
                value: 12,
                relation: 'eq',
              },
              max_score: null,
              hits: [
                {
                  _index: '.ds-.monitoring-es-8-mb-2022.11.15-000707',
                  _id: 'KO0hgYQBbFxIAxIBIYNu',
                  _score: null,
                  _source: {
                    elasticsearch: {
                      cluster: {
                        stats: {
                          state: {
                            nodes: {
                              qrLmmSBMSXGSfciYLjL3GA: {
                                transport_address: '10.47.192.135:19886',
                                roles: [
                                  'data_content',
                                  'data_hot',
                                  'ingest',
                                  'master',
                                  'remote_cluster_client',
                                  'transform',
                                ],
                                name: 'desktop-dca-192-168-162-170.endgames.local',
                                external_id: 'desktop-dca-192-168-162-170.endgames.local',
                                attributes: {
                                  logical_availability_zone: 'zone-1',
                                  server_name:
                                    'desktop-dca-192-168-162-170.endgames.local.7d15903c1534485c8dc4b5e8cced1c33',
                                  availability_zone: 'us-west2-a',
                                  'xpack.installed': 'true',
                                  data: 'hot',
                                  instance_configuration: 'gcp.data.highio.1',
                                  region: 'unknown-region',
                                },
                                ephemeral_id: 'cCXPWB3nSoKkl_m_q2nPFQ',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  sort: [1668613742384],
                },
                {
                  _index: '.ds-.monitoring-es-8-mb-2022.11.15-000707',
                  _id: 'vggggYQBkaDaBbfJ-mlf',
                  _score: null,
                  _source: {
                    elasticsearch: {
                      cluster: {
                        stats: {
                          state: {
                            nodes: {
                              qrLmmSBMSXGSfciYLjL3GA: {
                                roles: [
                                  'data_content',
                                  'data_hot',
                                  'ingest',
                                  'master',
                                  'remote_cluster_client',
                                  'transform',
                                ],
                                transport_address: '10.47.192.135:19886',
                                name: 'desktop-dca-192-168-162-170.endgames.local',
                                attributes: {
                                  logical_availability_zone: 'zone-1',
                                  server_name:
                                    'desktop-dca-192-168-162-170.endgames.local.7d15903c1534485c8dc4b5e8cced1c33',
                                  availability_zone: 'us-west2-a',
                                  'xpack.installed': 'true',
                                  data: 'hot',
                                  instance_configuration: 'gcp.data.highio.1',
                                  region: 'unknown-region',
                                },
                                external_id: 'desktop-dca-192-168-162-170.endgames.local',
                                ephemeral_id: 'cCXPWB3nSoKkl_m_q2nPFQ',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  sort: [1668613732384],
                },
              ],
            },
          },
        },
      ],
    },
  },
};

const esLegacyRes: estypes.SearchResponse = {
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

const getConfig = (ccsEnabled: boolean) =>
  ({
    config: {
      ui: {
        ccs: { enabled: ccsEnabled },
      },
    },
  } as Partial<typeof Globals.app> as typeof Globals.app);

describe.each([
  ['legacy', esLegacyRes],
  ['metricbeat/package', esMetricbeatRes],
])('fetchNodesFromClusterStats %s', (_, esRes) => {
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const clusters = [
    {
      clusterUuid: 'NG2d5jHiSBGPE6HLlUN2Bg',
      clusterName: 'elasticsearch',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Globals, 'app', 'get').mockReturnValue(getConfig(true));
  });

  it('fetch stats', async () => {
    esClient.search.mockResponse(esRes);
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
    let params: estypes.SearchRequest | undefined;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes);
    });
    await fetchNodesFromClusterStats(esClient, clusters);
    expect(params).toStrictEqual({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.stack_monitoring.cluster_stats-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*',
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
                    {
                      term: {
                        'data_stream.dataset': 'elasticsearch.stack_monitoring.cluster_stats',
                      },
                    },
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
                    includes: ['cluster_state.nodes', 'elasticsearch.cluster.stats.states.nodes'],
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
    jest.spyOn(Globals, 'app', 'get').mockReturnValue(getConfig(false));

    let params: estypes.SearchRequest | undefined;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes);
    });
    await fetchNodesFromClusterStats(esClient, clusters);
    expect(params?.index).toBe(
      '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*'
    );
  });
});
