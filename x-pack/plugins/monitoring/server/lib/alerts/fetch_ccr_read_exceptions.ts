/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { CCS_REMOTE_PATTERN } from '../../../common/constants';
import { CCRReadExceptionsStats } from '../../../common/types/alerts';
import { getIndexPatterns, getElasticsearchDataset } from '../cluster/get_index_patterns';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';

export async function fetchCCRReadExceptions(
  esClient: ElasticsearchClient,
  startMs: number,
  endMs: number,
  size: number,
  filterQuery?: string
): Promise<CCRReadExceptionsStats[]> {
  const indexPatterns = getIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'ccr',
    ccs: CCS_REMOTE_PATTERN,
  });
  const params = {
    index: indexPatterns,
    filter_path: ['aggregations.remote_clusters.buckets'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    nested: {
                      ignore_unmapped: true,
                      path: 'ccr_stats.read_exceptions',
                      query: {
                        exists: {
                          field: 'ccr_stats.read_exceptions.exception',
                        },
                      },
                    },
                  },
                  {
                    nested: {
                      ignore_unmapped: true,
                      path: 'elasticsearch.ccr.read_exceptions',
                      query: {
                        exists: {
                          field: 'elasticsearch.ccr.read_exceptions.exception',
                        },
                      },
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            createDatasetFilter('ccr_stats', 'ccr', getElasticsearchDataset('ccr')),
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
                          order: 'desc' as const,
                          unmapped_type: 'long' as const,
                        },
                      },
                    ],
                    _source: {
                      includes: [
                        'cluster_uuid',
                        'elasticsearch.cluster.id',
                        'ccr_stats.read_exceptions',
                        'elasticsearch.ccr.read_exceptions',
                        'ccr_stats.shard_id',
                        'elasticsearch.ccr.shard_id',
                        'ccr_stats.leader_index',
                        'elasticsearch.ccr.leader.index',
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

  try {
    if (filterQuery) {
      const filterQueryObject = JSON.parse(filterQuery);
      params.body.query.bool.filter.push(filterQueryObject);
    }
  } catch (e) {
    // meh
  }

  const response = await esClient.search(params);
  const stats: CCRReadExceptionsStats[] = [];

  if (!response.aggregations) {
    return stats;
  }

  // @ts-expect-error declare aggegations type explicitly
  const { buckets: remoteClusterBuckets = [] } = response.aggregations.remote_clusters;

  if (!remoteClusterBuckets?.length) {
    return stats;
  }

  for (const remoteClusterBucket of remoteClusterBuckets) {
    const followerIndicesBuckets = remoteClusterBucket.follower_indices.buckets;
    const remoteCluster = remoteClusterBucket.key;

    for (const followerIndexBucket of followerIndicesBuckets) {
      const followerIndex = followerIndexBucket.key;
      const clusterUuid =
        get(followerIndexBucket, 'hits.hits.hits[0]._source.cluster_uuid') ||
        get(followerIndexBucket, 'hits.hits.hits[0]_source.elasticsearch.cluster.id');

      const monitoringIndexName = get(followerIndexBucket, 'hits.hits.hits[0]._index');
      const ccrStats =
        get(followerIndexBucket, 'hits.hits.hits[0]._source.ccr_stats') ||
        get(followerIndexBucket, 'hits.hits.hits[0]._source.elasticsearch.ccr');

      const { read_exceptions: readExceptions, shard_id: shardId } = ccrStats;

      const leaderIndex = ccrStats.leaderIndex || ccrStats.leader.index;

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
