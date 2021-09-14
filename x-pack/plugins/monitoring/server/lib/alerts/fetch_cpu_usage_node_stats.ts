/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { get } from 'lodash';
import moment from 'moment';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../common/constants';
import { AlertCluster, AlertCpuUsageNodeStats } from '../../../common/types/alerts';

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
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  index: string,
  startMs: number,
  endMs: number,
  size: number
): Promise<AlertCpuUsageNodeStats[]> {
  // Using pure MS didn't seem to work well with the date_histogram interval
  // but minutes does
  const intervalInMinutes = moment.duration(endMs - startMs).asMinutes();
  const params = {
    index,
    filter_path: ['aggregations'],
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
                histo: {
                  date_histogram: {
                    field: 'timestamp',
                    fixed_interval: `${intervalInMinutes}m`,
                  },
                  aggs: {
                    average_periods: {
                      max: {
                        field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
                      },
                    },
                    average_usage: {
                      max: {
                        field: 'node_stats.os.cgroup.cpuacct.usage_nanos',
                      },
                    },
                    usage_deriv: {
                      derivative: {
                        buckets_path: 'average_usage',
                        gap_policy: 'skip' as const,
                        unit: NORMALIZED_DERIVATIVE_UNIT,
                      },
                    },
                    periods_deriv: {
                      derivative: {
                        buckets_path: 'average_periods',
                        gap_policy: 'skip' as const,
                        unit: NORMALIZED_DERIVATIVE_UNIT,
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
  };

  const { body: response } = await esClient.search(params);
  const stats: AlertCpuUsageNodeStats[] = [];
  const clusterBuckets = get(
    response,
    'aggregations.clusters.buckets',
    []
  ) as ClusterBucketESResponse[];
  for (const clusterBucket of clusterBuckets) {
    for (const node of clusterBucket.nodes.buckets) {
      const lastBucket = get(node, 'histo.buckets[1]', {});
      const indexName = get(node, 'index.buckets[0].key', '');
      const stat = {
        clusterUuid: clusterBucket.key,
        nodeId: node.key,
        nodeName: get(node, 'name.buckets[0].key'),
        cpuUsage: get(node, 'average_cpu.value'),
        containerUsage: get(lastBucket, 'usage_deriv.normalized_value'),
        containerPeriods: get(lastBucket, 'periods_deriv.normalized_value'),
        containerQuota: get(node, 'average_quota.value'),
        ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
      };
      stats.push(stat);
    }
  }
  return stats;
}
