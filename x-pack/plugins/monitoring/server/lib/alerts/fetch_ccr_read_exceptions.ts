/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { get } from 'lodash';
import { CCRReadExceptionsStats } from '../../../common/types/alerts';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { getConfigCcs } from '../../../common/ccs_utils';

export async function fetchCCRReadExceptions(
  esClient: ElasticsearchClient,
  startMs: number,
  endMs: number,
  size: number,
  filterQuery?: string
): Promise<CCRReadExceptionsStats[]> {
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'ccr',
    ccs: getConfigCcs(Globals.app.config) ? '*' : undefined,
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
              nested: {
                path: 'ccr_stats.read_exceptions',
                query: {
                  exists: {
                    field: 'ccr_stats.read_exceptions.exception',
                  },
                },
              },
            },
            createDatasetFilter('ccr_stats', 'elasticsearch.ccr'),
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

  try {
    if (filterQuery) {
      const filterQueryObject = JSON.parse(filterQuery);
      params.body.query.bool.filter.push(filterQueryObject);
    }
  } catch (e) {
    // meh
  }

  const { body: response } = await esClient.search(params);
  const stats: CCRReadExceptionsStats[] = [];
  // @ts-expect-error declare aggegations type explicitly
  const { buckets: remoteClusterBuckets = [] } = response.aggregations?.remote_clusters;

  if (!remoteClusterBuckets?.length) {
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
