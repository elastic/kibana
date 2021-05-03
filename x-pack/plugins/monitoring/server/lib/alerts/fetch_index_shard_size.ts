/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
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
  esClient: ElasticsearchClient,
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
                              order: 'desc' as const,
                              unmapped_type: 'long' as const,
                            },
                          },
                        ],
                        _source: {
                          includes: [
                            '_index',
                            'index_stats.shards.primaries',
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

  const { body: response } = await esClient.search(params);
  const stats: IndexShardSizeStats[] = [];
  // @ts-expect-error @elastic/elasticsearch Aggregate does not specify buckets
  const { buckets: clusterBuckets = [] } = response.aggregations.clusters;
  const validIndexPatterns = memoizedIndexPatterns(shardIndexPatterns);

  if (!clusterBuckets.length) {
    return stats;
  }
  const thresholdBytes = threshold * gbMultiplier;
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

      if (!indexStats || !indexStats.primaries) {
        continue;
      }

      const { primaries: totalPrimaryShards } = indexStats.shards;
      const { size_in_bytes: primaryShardSizeBytes = 0 } = indexStats.primaries.store || {};
      if (!primaryShardSizeBytes || !totalPrimaryShards) {
        continue;
      }
      /**
       * We can only calculate the average primary shard size at this point, since we don't have
       * data (in .monitoring-es* indices) to give us individual shards. This might change in the future
       */
      const { name: nodeName, uuid: nodeId } = sourceNode;
      const avgShardSize = primaryShardSizeBytes / totalPrimaryShards;
      if (avgShardSize < thresholdBytes) {
        continue;
      }
      const shardSize = +(avgShardSize / gbMultiplier).toFixed(2);
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
