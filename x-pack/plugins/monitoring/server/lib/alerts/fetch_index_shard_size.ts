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
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';

type TopHitType = ElasticsearchResponseHit & {
  _source: { index_stats?: Partial<ElasticsearchIndexStats> };
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
  threshold: number,
  shardIndexPatterns: string,
  size: number,
  filterQuery?: string
): Promise<IndexShardSizeStats[]> {
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'index',
    ccs: Globals.app.config.ui.ccs.remotePatterns,
  });
  const params = {
    index: indexPatterns,
    filter_path: ['aggregations.clusters.buckets'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            createDatasetFilter('index_stats', 'index', 'elasticsearch.index'),
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
                        'elasticsearch.index.shards.primaries',
                        'elasticsearch.index.primaries.store.size_in_bytes',
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
  // @ts-expect-error declare aggegations type explicitly
  const { buckets: clusterBuckets } = response.aggregations?.clusters;
  const stats: IndexShardSizeStats[] = [];
  if (!clusterBuckets?.length) {
    return stats;
  }
  const validIndexPatterns = memoizedIndexPatterns(shardIndexPatterns);
  const thresholdBytes = threshold * gbMultiplier;
  for (const clusterBucket of clusterBuckets) {
    const indexBuckets = clusterBucket.index.buckets;
    const clusterUuid = clusterBucket.key;

    for (const indexBucket of indexBuckets) {
      const shardIndex = indexBucket.key;
      const topHit = indexBucket.hits?.hits?.hits[0] as TopHitType;
      if (!topHit || !ESGlobPatterns.isValid(shardIndex, validIndexPatterns)) {
        continue;
      }
      const { _index: monitoringIndexName, _source } = topHit;
      const indexStats = _source.index_stats || _source.elasticsearch?.index;

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
      const avgShardSize = primaryShardSizeBytes / totalPrimaryShards;
      if (avgShardSize < thresholdBytes) {
        continue;
      }
      const shardSize = +(avgShardSize / gbMultiplier).toFixed(2);
      stats.push({
        shardIndex,
        shardSize,
        clusterUuid,
        ccs: monitoringIndexName.includes(':') ? monitoringIndexName.split(':')[0] : undefined,
      });
    }
  }
  return stats;
}
