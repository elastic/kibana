/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchDiskUsageNodeStats } from './fetch_disk_usage_node_stats';

describe('fetchDiskUsageNodeStats', () => {
  let callCluster = jest.fn();
  const clusters = [
    {
      clusterUuid: 'cluster123',
      clusterName: 'test-cluster',
    },
  ];
  const index = '.monitoring-es-*';
  const duration = '5m';
  const size = 10;

  it('fetch normal stats', async () => {
    callCluster = jest.fn().mockImplementation(() => {
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
                            key: '.monitoring-es-*',
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
                      usage_ratio_percentile: {
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

    const result = await fetchDiskUsageNodeStats(callCluster, clusters, index, duration, size);
    expect(result).toEqual([
      {
        clusterUuid: clusters[0].clusterUuid,
        nodeName: 'theNodeName',
        nodeId: 'theNodeId',
        diskUsage: 10,
        ccs: null,
      },
    ]);
  });
});
