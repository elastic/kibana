/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertCluster, IndexShardSizeStats } from '../../../common/types/alerts';
import { ElasticsearchIndexStats, ElasticsearchResponseHit } from '../../../common/types/es';
import { ESGlobPatterns, RegExPatterns } from '../../../common/es_glob_patterns';
import { Globals } from '../../static_globals';

interface SourceNode {
  name: string;
  uuid: string;
}
type TopHitType = ElasticsearchResponseHit & {
  _source: { index_stats: Partial<ElasticsearchIndexStats>; source_node: SourceNode };
};

const memoizedIndexPatterns = (globPatterns: string) => {
  const createRegExPatterns = () => ESGlobPatterns.createRegExPatterns(globPatterns);
  return Globals.app.getKeyStoreValue(
    `large_shard_size_alert::${globPatterns}`,
    createRegExPatterns
  ) as RegExPatterns;
};

const gbMultiplier = 1000000000;

export async function fetchIndexShardSize(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  threshold: number,
  shardIndexPatterns: string,
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
                    gt: threshold * gbMultiplier,
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
                          includes: [
                            '_index',
                            'index_stats.primaries.store.size_in_bytes',
                            'source_node.name',
                            'source_node.uuid',
                          ],
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
  const validIndexPatterns = memoizedIndexPatterns(shardIndexPatterns);

  if (!clusterBuckets.length) {
    return stats;
  }

  for (const clusterBucket of clusterBuckets) {
    const indexBuckets = clusterBucket.over_threshold.index.buckets;
    const clusterUuid = clusterBucket.key;

    for (const indexBucket of indexBuckets) {
      const shardIndex = indexBucket.key;
      const topHit = indexBucket.hits?.hits?.hits[0] as TopHitType;
      if (
        !topHit ||
        shardIndex.charAt() === '.' ||
        !ESGlobPatterns.isValid(shardIndex, validIndexPatterns)
      ) {
        continue;
      }
      const {
        _index: monitoringIndexName,
        _source: { source_node: sourceNode, index_stats: indexStats },
      } = topHit;

      const { size_in_bytes: shardSizeBytes } = indexStats?.primaries?.store!;
      const { name: nodeName, uuid: nodeId } = sourceNode;
      const shardSize = +(shardSizeBytes! / gbMultiplier).toFixed(2);
      stats.push({
        shardIndex,
        shardSize,
        clusterUuid,
        nodeName,
        nodeId,
        ccs: monitoringIndexName.includes(':') ? monitoringIndexName.split(':')[0] : undefined,
      });
    }
  }
  return stats;
}
