/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { AlertCluster, AlertMemoryUsageNodeStats } from '../../../common/types/alerts';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { getConfigCcs } from '../../../common/ccs_utils';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';

export async function fetchMemoryUsageNodeStats(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  startMs: number,
  endMs: number,
  size: number,
  filterQuery?: string
): Promise<AlertMemoryUsageNodeStats[]> {
  const clustersIds = clusters.map((cluster) => cluster.clusterUuid);
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'node_stats',
    ccs: getConfigCcs(Globals.app.config) ? '*' : undefined,
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

  try {
    if (filterQuery) {
      const filterQueryObject = JSON.parse(filterQuery);
      params.body.query.bool.filter.push(filterQueryObject);
    }
  } catch (e) {
    // meh
  }

  const response = await esClient.search(params);
  const stats: AlertMemoryUsageNodeStats[] = [];
  // @ts-expect-error declare type for aggregations explicitly
  const { buckets: clusterBuckets } = response.aggregations?.clusters;

  if (!clusterBuckets?.length) {
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
