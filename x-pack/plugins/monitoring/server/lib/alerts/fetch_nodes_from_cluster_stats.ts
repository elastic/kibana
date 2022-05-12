/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import { AlertCluster, AlertClusterStatsNodes } from '../../../common/types/alerts';
import { ElasticsearchSource } from '../../../common/types/es';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { CCS_REMOTE_PATTERN } from '../../../common/constants';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';

function formatNode(
  nodes: NonNullable<NonNullable<ElasticsearchSource['cluster_state']>['nodes']> | undefined
) {
  if (!nodes) {
    return [];
  }
  return Object.keys(nodes).map((nodeUuid) => {
    return {
      nodeUuid,
      nodeEphemeralId: nodes[nodeUuid].ephemeral_id,
      nodeName: nodes[nodeUuid].name,
    };
  });
}

export async function fetchNodesFromClusterStats(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  filterQuery?: string
): Promise<AlertClusterStatsNodes[]> {
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'cluster_stats',
    ccs: CCS_REMOTE_PATTERN,
  });
  const params = {
    index: indexPatterns,
    filter_path: ['aggregations.clusters.buckets'],
    body: {
      size: 0,
      sort: [
        {
          timestamp: {
            order: 'desc' as const,
            unmapped_type: 'long' as const,
          },
        },
      ],
      query: {
        bool: {
          filter: [
            createDatasetFilter('cluster_stats', 'cluster_stats', 'elasticsearch.cluster_stats'),
            {
              range: {
                timestamp: {
                  gte: 'now-2m',
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
          },
          aggs: {
            top: {
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
                  includes: ['cluster_state.nodes', 'elasticsearch.cluster.stats.nodes'],
                },
                size: 2,
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
  const nodes: AlertClusterStatsNodes[] = [];
  // @ts-expect-error declare type for aggregations explicitly
  const clusterBuckets = response.aggregations?.clusters?.buckets;
  if (!clusterBuckets?.length) {
    return nodes;
  }
  for (const clusterBucket of clusterBuckets) {
    const clusterUuid = clusterBucket.key;
    const hits = clusterBucket.top.hits.hits;
    const indexName = hits[0]._index;
    nodes.push({
      clusterUuid,
      recentNodes: formatNode(
        hits[0]._source.cluster_state?.nodes || hits[0]._source.elasticsearch.cluster.stats.nodes
      ),
      priorNodes: formatNode(
        hits[1]._source.cluster_state?.nodes || hits[1]._source.elasticsearch.cluster.stats.nodes
      ),
      ccs: indexName.includes(':') ? indexName.split(':')[0] : undefined,
    });
  }
  return nodes;
}
