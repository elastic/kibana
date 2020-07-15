/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchCpuUsageNodeStats } from './fetch_cpu_usage_node_stats';

describe('fetchCpuUsageNodeStats', () => {
  let callCluster = jest.fn();
  const clusters = [
    {
      clusterUuid: 'abc123',
      clusterName: 'test',
    },
  ];
  const index = '.monitoring-es-*';
  const startMs = 0;
  const endMs = 0;
  const size = 10;

  it('fetch normal stats', async () => {
    callCluster = jest.fn().mockImplementation((...args) => {
      return {
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
      };
    });
    const result = await fetchCpuUsageNodeStats(callCluster, clusters, index, startMs, endMs, size);
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
    callCluster = jest.fn().mockImplementation((...args) => {
      return {
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
      };
    });
    const result = await fetchCpuUsageNodeStats(callCluster, clusters, index, startMs, endMs, size);
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
    callCluster = jest.fn().mockImplementation((...args) => {
      return {
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
      };
    });
    const result = await fetchCpuUsageNodeStats(callCluster, clusters, index, startMs, endMs, size);
    expect(result[0].ccs).toBe('foo');
  });

  it('should use consistent params', async () => {
    let params = null;
    callCluster = jest.fn().mockImplementation((...args) => {
      params = args[1];
    });
    await fetchCpuUsageNodeStats(callCluster, clusters, index, startMs, endMs, size);
    expect(params).toStrictEqual({
      index,
      filterPath: ['aggregations'],
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { cluster_uuid: clusters.map((cluster) => cluster.clusterUuid) } },
              { term: { type: 'node_stats' } },
              { range: { timestamp: { format: 'epoch_millis', gte: 0, lte: 0 } } },
            ],
          },
        },
        aggs: {
          clusters: {
            terms: {
              field: 'cluster_uuid',
              size,
              include: clusters.map((cluster) => cluster.clusterUuid),
            },
            aggs: {
              nodes: {
                terms: { field: 'node_stats.node_id', size },
                aggs: {
                  index: { terms: { field: '_index', size: 1 } },
                  average_cpu: { avg: { field: 'node_stats.process.cpu.percent' } },
                  average_usage: { avg: { field: 'node_stats.os.cgroup.cpuacct.usage_nanos' } },
                  average_periods: {
                    avg: { field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods' },
                  },
                  average_quota: { avg: { field: 'node_stats.os.cgroup.cpu.cfs_quota_micros' } },
                  name: { terms: { field: 'source_node.name', size: 1 } },
                },
              },
            },
          },
        },
      },
    });
  });
});
