/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { CCRReadExceptionsStats } from '../../../common/types/alerts';

export async function fetchCCRReadExceptions(
  callCluster: any,
  index: string,
  startMs: number,
  endMs: number,
  size: number
): Promise<CCRReadExceptionsStats[]> {
  const params = {
    index,
    filterPath: ['aggregations.remote_clusters.buckets'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              nested: {
                path: 'ccr_stats.read_exceptions',
                query: {
                  exists: {
                    field: 'ccr_stats.read_exceptions.exception',
                  },
                },
              },
            },
            {
              term: {
                type: 'ccr_stats',
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
        remote_clusters: {
          terms: {
            field: 'ccr_stats.remote_cluster',
            size,
          },
          aggs: {
            follower_indices: {
              terms: {
                field: 'ccr_stats.follower_index',
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
                        'cluster_uuid',
                        'ccr_stats.read_exceptions',
                        'ccr_stats.shard_id',
                        'ccr_stats.leader_index',
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
  };

  const response = await callCluster('search', params);
  const stats: CCRReadExceptionsStats[] = [];
  const { buckets: remoteClusterBuckets = [] } = response.aggregations.remote_clusters;

  if (!remoteClusterBuckets.length) {
    return stats;
  }

  for (const remoteClusterBucket of remoteClusterBuckets) {
    const followerIndicesBuckets = remoteClusterBucket.follower_indices.buckets;
    const remoteCluster = remoteClusterBucket.key;

    for (const followerIndexBucket of followerIndicesBuckets) {
      const followerIndex = followerIndexBucket.key;
      const {
        _index: monitoringIndexName,
        _source: { ccr_stats: ccrStats, cluster_uuid: clusterUuid },
      } = get(followerIndexBucket, 'hits.hits.hits[0]');
      const {
        read_exceptions: readExceptions,
        leader_index: leaderIndex,
        shard_id: shardId,
      } = ccrStats;
      const { exception: lastReadException } = readExceptions[readExceptions.length - 1];

      stats.push({
        clusterUuid,
        remoteCluster,
        followerIndex,
        shardId,
        leaderIndex,
        lastReadException,
        ccs: monitoringIndexName.includes(':') ? monitoringIndexName.split(':')[0] : null,
      });
    }
  }
  return stats;
}
