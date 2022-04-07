/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { fetchMissingMonitoringData } from './fetch_missing_monitoring_data';

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

function getResponse(
  index: string,
  products: Array<{
    uuid: string;
    timestamp: number;
    nameSource: any;
  }>
) {
  return {
    buckets: products.map((product) => {
      return {
        key: product.uuid,
        most_recent: {
          value: product.timestamp,
        },
        document: {
          hits: {
            hits: [
              {
                _index: index,
                _source: product.nameSource,
              },
            ],
          },
        },
      };
    }),
  };
}

describe('fetchMissingMonitoringData', () => {
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

  const startMs = 100;
  const size = 10;

  it('fetch as expected', async () => {
    const now = 10;
    const clusters = [
      {
        clusterUuid: 'clusterUuid1',
        clusterName: 'clusterName1',
      },
    ];

    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      {
        aggregations: {
          clusters: {
            buckets: clusters.map((cluster) => ({
              key: cluster.clusterUuid,
              es_uuids: getResponse('.monitoring-es-*', [
                {
                  uuid: 'nodeUuid1',
                  nameSource: {
                    source_node: {
                      name: 'nodeName1',
                    },
                  },
                  timestamp: 9,
                },
                {
                  uuid: 'nodeUuid2',
                  nameSource: {
                    source_node: {
                      name: 'nodeName2',
                    },
                  },
                  timestamp: 2,
                },
              ]),
            })),
          },
        },
      }
    );
    const result = await fetchMissingMonitoringData(esClient, clusters, size, now, startMs);
    expect(result).toEqual([
      {
        nodeId: 'nodeUuid1',
        nodeName: 'nodeName1',
        clusterUuid: 'clusterUuid1',
        gapDuration: 1,
        ccs: null,
      },
      {
        nodeId: 'nodeUuid2',
        nodeName: 'nodeName2',
        clusterUuid: 'clusterUuid1',
        gapDuration: 8,
        ccs: null,
      },
    ]);
  });

  it('should handle ccs', async () => {
    const now = 10;
    const clusters = [
      {
        clusterUuid: 'clusterUuid1',
        clusterName: 'clusterName1',
      },
    ];
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      {
        aggregations: {
          clusters: {
            buckets: clusters.map((cluster) => ({
              key: cluster.clusterUuid,
              es_uuids: getResponse('Monitoring:.monitoring-es-*', [
                {
                  uuid: 'nodeUuid1',
                  nameSource: {
                    source_node: {
                      name: 'nodeName1',
                    },
                  },
                  timestamp: 9,
                },
              ]),
            })),
          },
        },
      }
    );
    const result = await fetchMissingMonitoringData(esClient, clusters, size, now, startMs);
    expect(result).toEqual([
      {
        nodeId: 'nodeUuid1',
        nodeName: 'nodeName1',
        clusterUuid: 'clusterUuid1',
        gapDuration: 1,
        ccs: 'Monitoring',
      },
    ]);
  });

  it('should call ES with correct query', async () => {
    const now = 10;
    const clusters = [
      {
        clusterUuid: 'clusterUuid1',
        clusterName: 'clusterName1',
      },
    ];
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve({} as any);
    });
    await fetchMissingMonitoringData(esClient, clusters, size, now, startMs);
    expect(params).toStrictEqual({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.node_stats-*,metrics-elasticsearch.node_stats-*',
      filter_path: ['aggregations.clusters.buckets'],
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { cluster_uuid: ['clusterUuid1'] } },
              {
                bool: {
                  should: [
                    { term: { type: 'node_stats' } },
                    { term: { 'metricset.name': 'node_stats' } },
                    { term: { 'data_stream.dataset': 'elasticsearch.node_stats' } },
                  ],
                  minimum_should_match: 1,
                },
              },
              { range: { timestamp: { format: 'epoch_millis', gte: 100, lte: 10 } } },
            ],
          },
        },
        aggs: {
          clusters: {
            terms: { field: 'cluster_uuid', size: 10 },
            aggs: {
              es_uuids: {
                terms: { field: 'node_stats.node_id', size: 10 },
                aggs: {
                  most_recent: { max: { field: 'timestamp' } },
                  document: {
                    top_hits: {
                      size: 1,
                      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
                      _source: {
                        includes: ['source_node.name', 'elasticsearch.node.name'],
                      },
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
    const now = 10;
    const clusters = [
      {
        clusterUuid: 'clusterUuid1',
        clusterName: 'clusterName1',
      },
    ];
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = false;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve({} as any);
    });
    await fetchMissingMonitoringData(esClient, clusters, size, now, startMs);
    // @ts-ignore
    expect(params.index).toBe('.monitoring-es-*,metrics-elasticsearch.node_stats-*');
  });
});
