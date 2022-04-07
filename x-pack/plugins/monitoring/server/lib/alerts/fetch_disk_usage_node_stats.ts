/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { get } from 'lodash';
import { AlertCluster, AlertDiskUsageNodeStats } from '../../../common/types/alerts';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';

export async function fetchDiskUsageNodeStats(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  duration: string,
  size: number,
  filterQuery?: string
): Promise<AlertDiskUsageNodeStats[]> {
  const clustersIds = clusters.map((cluster) => cluster.clusterUuid);
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'node_stats',
    ccs: Globals.app.config.ui.ccs.remotePatterns,
  });
  const params = {
    index: indexPatterns,
    filter_path: ['aggregations'],
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
            createDatasetFilter('node_stats', 'node_stats', 'elasticsearch.node_stats'),
            {
              range: {
                timestamp: {
                  gte: `now-${duration}`,
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
            include: clustersIds,
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
                total_in_bytes: {
                  max: {
                    field: 'node_stats.fs.total.total_in_bytes',
                  },
                },
                available_in_bytes: {
                  max: {
                    field: 'node_stats.fs.total.available_in_bytes',
                  },
                },
                usage_ratio_percentile: {
                  bucket_script: {
                    buckets_path: {
                      available_in_bytes: 'available_in_bytes',
                      total_in_bytes: 'total_in_bytes',
                    },
                    script:
                      '100 - Math.floor((params.available_in_bytes / params.total_in_bytes) * 100)',
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

  try {
    if (filterQuery) {
      const filterQueryObject = JSON.parse(filterQuery);
      params.body.query.bool.filter.push(filterQueryObject);
    }
  } catch (e) {
    // meh
  }

  const response = await esClient.search(params);
  const stats: AlertDiskUsageNodeStats[] = [];
  // @ts-expect-error declare type for aggregations explicitly
  const { buckets: clusterBuckets } = response.aggregations?.clusters;

  if (!clusterBuckets?.length) {
    return stats;
  }

  for (const clusterBucket of clusterBuckets) {
    for (const node of clusterBucket.nodes.buckets) {
      const indexName = get(node, 'index.buckets[0].key', '');
      const diskUsage = Number(get(node, 'usage_ratio_percentile.value'));
      if (isNaN(diskUsage) || diskUsage === undefined || diskUsage === null) {
        continue;
      }
      stats.push({
        diskUsage,
        clusterUuid: clusterBucket.key,
        nodeId: node.key,
        nodeName: get(node, 'name.buckets[0].key'),
        ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
      });
    }
  }
  return stats;
}
