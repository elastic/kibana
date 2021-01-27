/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { AlertCluster, IndexShardSizeStats } from '../../../common/types/alerts';

export async function fetchIndexShardSize(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  thresholdBytes: number,
  shardIndexPattern: string,
  size: number
): Promise<IndexShardSizeStats[]> {
  const params = {
    index,
    filterPath: ['aggregations.clusters.buckets'],
    body: {
      size: 0,
      query: {
        bool: {
          must: [
            {
              match: {
                type: 'index_stats',
              },
            },
            {
              range: {
                timestamp: {
                  gte: 'now-5m',
                },
              },
            },
          ],
        },
      },
      aggs: {
        clusters: {
          terms: {
            include: clusters.map((cluster) => cluster.clusterUuid),
            field: 'cluster_uuid',
            size,
          },
          aggs: {
            over_threshold: {
              filter: {
                range: {
                  'index_stats.primaries.store.size_in_bytes': {
                    gt: thresholdBytes,
                  },
                },
              },
              aggs: {
                index: {
                  terms: {
                    field: 'index_stats.index',
                    size,
                  },
                  aggs: {
                    hits: {
                      top_hits: {
                        sort: [
                          {
                            timestamp: {
                              order: 'desc',
                              unmapped_type: 'long',
                            },
                          },
                        ],
                        _source: {
                          includes: ['_index', 'index_stats', 'source_node'],
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
      },
    },
  };

  const response = await callCluster('search', params);
  const stats: IndexShardSizeStats[] = [];
  const { buckets: clusterBuckets = [] } = response.aggregations.clusters;

  if (!clusterBuckets.length) {
    return stats;
  }

  for (const clusterBucket of clusterBuckets) {
    const indexBuckets = clusterBucket.index.buckets;
    const clusterUuid = clusterBucket.key;

    for (const indexBucket of indexBuckets) {
      const shardIndex = indexBucket.key;
      const {
        _index: monitoringIndexName,
        _source: { source_node: sourceNode, index_stats: indexStats },
      } = get(indexBucket, 'hits.hits.hits[0]');

      const { size_in_bytes: shardSize } = indexStats.primaries.store;
      const { name: nodeName, uuid: nodeId } = sourceNode;

      stats.push({
        shardIndex,
        shardSize,
        clusterUuid,
        nodeName,
        nodeId,
        ccs: monitoringIndexName.includes(':') ? monitoringIndexName.split(':')[0] : null,
      });
    }
  }
  return stats;
}
