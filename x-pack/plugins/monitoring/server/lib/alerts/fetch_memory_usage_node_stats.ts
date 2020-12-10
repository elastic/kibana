/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { AlertCluster, AlertMemoryUsageNodeStats } from '../../../common/types/alerts';

export async function fetchMemoryUsageNodeStats(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  startMs: number,
  endMs: number,
  size: number
): Promise<AlertMemoryUsageNodeStats[]> {
  const clustersIds = clusters.map((cluster) => cluster.clusterUuid);
  const params = {
    index,
    filterPath: ['aggregations'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                cluster_uuid: clustersIds,
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
          },
          aggs: {
            nodes: {
              terms: {
                field: 'source_node.uuid',
                size,
              },
              aggs: {
                index: {
                  terms: {
                    field: '_index',
                    size: 1,
                  },
                },
                avg_heap: {
                  avg: {
                    field: 'node_stats.jvm.mem.heap_used_percent',
                  },
                },
                cluster_uuid: {
                  terms: {
                    field: 'cluster_uuid',
                    size: 1,
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
  const stats: AlertMemoryUsageNodeStats[] = [];
  const { buckets: clusterBuckets = [] } = response.aggregations.clusters;

  if (!clusterBuckets.length) {
    return stats;
  }

  for (const clusterBucket of clusterBuckets) {
    for (const node of clusterBucket.nodes.buckets) {
      const indexName = get(node, 'index.buckets[0].key', '');
      const memoryUsage = Math.floor(Number(get(node, 'avg_heap.value')));
      if (isNaN(memoryUsage) || memoryUsage === undefined || memoryUsage === null) {
        continue;
      }
      stats.push({
        memoryUsage,
        clusterUuid: clusterBucket.key,
        nodeId: node.key,
        nodeName: get(node, 'name.buckets[0].key'),
        ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
      });
    }
  }
  return stats;
}
