/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertCluster, AlertClusterStatsNodes } from '../../../common/types/alerts';
import { ElasticsearchSource } from '../../../common/types/es';

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
  callCluster: any,
  clusters: AlertCluster[],
  index: string
): Promise<AlertClusterStatsNodes[]> {
  const params = {
    index,
    filterPath: ['aggregations.clusters.buckets'],
    body: {
      size: 0,
      sort: [
        {
          timestamp: {
            order: 'desc',
            unmapped_type: 'long',
          },
        },
      ],
      query: {
        bool: {
          filter: [
            {
              term: {
                type: 'cluster_stats',
              },
            },
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
                      order: 'desc',
                      unmapped_type: 'long',
                    },
                  },
                ],
                _source: {
                  includes: ['cluster_state.nodes_hash', 'cluster_state.nodes'],
                },
                size: 2,
              },
            },
          },
        },
      },
    },
  };

  const response = await callCluster('search', params);
  const nodes = [];
  const clusterBuckets = response.aggregations.clusters.buckets;
  for (const clusterBucket of clusterBuckets) {
    const clusterUuid = clusterBucket.key;
    const hits = clusterBucket.top.hits.hits;
    const indexName = hits[0]._index;
    nodes.push({
      clusterUuid,
      recentNodes: formatNode(hits[0]._source.cluster_state?.nodes),
      priorNodes: formatNode(hits[1]._source.cluster_state?.nodes),
      ccs: indexName.includes(':') ? indexName.split(':')[0] : undefined,
    });
  }
  return nodes;
}
