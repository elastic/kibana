/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCluster, AlertCpuUsageNodeStats } from '../../alerts/types';

interface NodeBucketESResponse {
  key: string;
  average_cpu: { value: number };
}

interface ClusterBucketESResponse {
  key: string;
  nodes: {
    buckets: NodeBucketESResponse[];
  };
}

export async function fetchCpuUsageNodeStats(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  startMs: number,
  endMs: number,
  size: number
): Promise<AlertCpuUsageNodeStats[]> {
  const filterPath = ['aggregations'];
  const params = {
    index,
    filterPath,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                cluster_uuid: clusters.map((cluster) => cluster.clusterUuid),
              },
            },
            {
              term: {
                type: 'node_stats',
              },
            },
            {
              range: {
                timestamp: {
                  format: 'epoch_millis',
                  gte: startMs,
                  lte: endMs,
                },
              },
            },
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
              terms: {
                field: 'node_stats.node_id',
                size,
              },
              aggs: {
                index: {
                  terms: {
                    field: '_index',
                    size: 1,
                  },
                },
                average_cpu: {
                  avg: {
                    field: 'node_stats.process.cpu.percent',
                  },
                },
                average_usage: {
                  avg: {
                    field: 'node_stats.os.cgroup.cpuacct.usage_nanos',
                  },
                },
                average_periods: {
                  avg: {
                    field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
                  },
                },
                average_quota: {
                  avg: {
                    field: 'node_stats.os.cgroup.cpu.cfs_quota_micros',
                  },
                },
                name: {
                  terms: {
                    field: 'source_node.name',
                    size: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const response = await callCluster('search', params);
  const stats: AlertCpuUsageNodeStats[] = [];
  const clusterBuckets = get(
    response,
    'aggregations.clusters.buckets',
    []
  ) as ClusterBucketESResponse[];
  for (const clusterBucket of clusterBuckets) {
    for (const node of clusterBucket.nodes.buckets) {
      const indexName = get(node, 'index.buckets[0].key', '');
      stats.push({
        clusterUuid: clusterBucket.key,
        nodeId: node.key,
        nodeName: get(node, 'name.buckets[0].key'),
        cpuUsage: get(node, 'average_cpu.value'),
        containerUsage: get(node, 'average_usage.value'),
        containerPeriods: get(node, 'average_periods.value'),
        containerQuota: get(node, 'average_quota.value'),
        ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
      });
    }
  }
  return stats;
}
