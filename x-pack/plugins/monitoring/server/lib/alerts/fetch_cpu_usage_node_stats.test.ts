/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { fetchCpuUsageNodeStats } from './fetch_cpu_usage_node_stats';

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          ccs: { enabled: true },
        },
      },
    },
  },
}));

describe('fetchCpuUsageNodeStats', () => {
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const clusters = [
    {
      clusterUuid: 'abc123',
      clusterName: 'test',
    },
  ];
  const startMs = 0;
  const endMs = 0;
  const size = 10;

  it('fetch normal stats', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      {
        aggregations: {
          clusters: {
            buckets: [
              {
                key: clusters[0].clusterUuid,
                nodes: {
                  buckets: [
                    {
                      key: 'theNodeId',
                      index: {
                        buckets: [
                          {
                            key: '.monitoring-es-TODAY',
                          },
                        ],
                      },
                      name: {
                        buckets: [
                          {
                            key: 'theNodeName',
                          },
                        ],
                      },
                      average_cpu: {
                        value: 10,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }
    );
    const result = await fetchCpuUsageNodeStats(esClient, clusters, startMs, endMs, size);
    expect(result).toEqual([
      {
        clusterUuid: clusters[0].clusterUuid,
        nodeName: 'theNodeName',
        nodeId: 'theNodeId',
        cpuUsage: 10,
        containerUsage: undefined,
        containerPeriods: undefined,
        containerQuota: undefined,
        ccs: null,
      },
    ]);
  });

  it('fetch container stats', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      {
        aggregations: {
          clusters: {
            buckets: [
              {
                key: clusters[0].clusterUuid,
                nodes: {
                  buckets: [
                    {
                      key: 'theNodeId',
                      index: {
                        buckets: [
                          {
                            key: '.monitoring-es-TODAY',
                          },
                        ],
                      },
                      name: {
                        buckets: [
                          {
                            key: 'theNodeName',
                          },
                        ],
                      },
                      histo: {
                        buckets: [
                          null,
                          {
                            usage_deriv: {
                              normalized_value: 10,
                            },
                            periods_deriv: {
                              normalized_value: 5,
                            },
                          },
                        ],
                      },
                      average_quota: {
                        value: 50,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }
    );
    const result = await fetchCpuUsageNodeStats(esClient, clusters, startMs, endMs, size);
    expect(result).toEqual([
      {
        clusterUuid: clusters[0].clusterUuid,
        nodeName: 'theNodeName',
        nodeId: 'theNodeId',
        cpuUsage: undefined,
        containerUsage: 10,
        containerPeriods: 5,
        containerQuota: 50,
        ccs: null,
      },
    ]);
  });

  it('fetch properly return ccs', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      {
        aggregations: {
          clusters: {
            buckets: [
              {
                key: clusters[0].clusterUuid,
                nodes: {
                  buckets: [
                    {
                      key: 'theNodeId',
                      index: {
                        buckets: [
                          {
                            key: 'foo:.monitoring-es-TODAY',
                          },
                        ],
                      },
                      name: {
                        buckets: [
                          {
                            key: 'theNodeName',
                          },
                        ],
                      },
                      average_usage: {
                        value: 10,
                      },
                      average_periods: {
                        value: 5,
                      },
                      average_quota: {
                        value: 50,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }
    );
    const result = await fetchCpuUsageNodeStats(esClient, clusters, startMs, endMs, size);
    expect(result[0].ccs).toBe('foo');
  });

  it('should use consistent params', async () => {
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve({} as estypes.SearchResponse);
    });
    const filterQuery =
      '{"bool":{"should":[{"exists":{"field":"cluster_uuid"}}],"minimum_should_match":1}}';
    await fetchCpuUsageNodeStats(esClient, clusters, startMs, endMs, size, filterQuery);
    expect(params).toStrictEqual({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.node_stats-*,metrics-elasticsearch.node_stats-*',
      filter_path: ['aggregations'],
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { cluster_uuid: ['abc123'] } },
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
              { range: { timestamp: { format: 'epoch_millis', gte: 0, lte: 0 } } },
              {
                bool: { should: [{ exists: { field: 'cluster_uuid' } }], minimum_should_match: 1 },
              },
            ],
          },
        },
        aggs: {
          clusters: {
            terms: { field: 'cluster_uuid', size: 10, include: ['abc123'] },
            aggs: {
              nodes: {
                terms: { field: 'node_stats.node_id', size: 10 },
                aggs: {
                  index: { terms: { field: '_index', size: 1 } },
                  average_cpu: { avg: { field: 'node_stats.process.cpu.percent' } },
                  average_quota: { avg: { field: 'node_stats.os.cgroup.cpu.cfs_quota_micros' } },
                  name: { terms: { field: 'source_node.name', size: 1 } },
                  histo: {
                    date_histogram: { field: 'timestamp', fixed_interval: '0m' },
                    aggs: {
                      average_periods: {
                        max: { field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods' },
                      },
                      average_usage: { max: { field: 'node_stats.os.cgroup.cpuacct.usage_nanos' } },
                      usage_deriv: {
                        derivative: {
                          buckets_path: 'average_usage',
                          gap_policy: 'skip',
                          unit: '1s',
                        },
                      },
                      periods_deriv: {
                        derivative: {
                          buckets_path: 'average_periods',
                          gap_policy: 'skip',
                          unit: '1s',
                        },
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
});
