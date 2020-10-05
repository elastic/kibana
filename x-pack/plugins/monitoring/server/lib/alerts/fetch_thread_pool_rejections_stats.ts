/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { AlertCluster, AlertThreadPoolRejectionsStats } from '../../alerts/types';

interface MaxField {
  max: {
    field: 'node_stats.thread_pool.search.rejected' | 'node_stats.thread_pool.write.rejected';
  };
}

interface RejectionsType {
  max_search_rejections?: MaxField;
  max_write_rejections?: MaxField;
}

const getRejectionsType = (search: boolean = true, write: boolean = true) => {
  const rejections: RejectionsType = {
    max_search_rejections: {
      max: {
        field: 'node_stats.thread_pool.search.rejected',
      },
    },
    max_write_rejections: {
      max: {
        field: 'node_stats.thread_pool.write.rejected',
      },
    },
  };
  if (!search) {
    delete rejections.max_search_rejections;
  }
  if (!write) {
    delete rejections.max_write_rejections;
  }
  return rejections;
};

const invalidNumberValue = (value: number) => {
  return isNaN(value) || value === undefined || value === null;
};

export async function fetchThreadPoolRejectionStats(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  size: number,
  searchRejections?: boolean,
  writeRejections?: boolean
): Promise<AlertThreadPoolRejectionsStats[]> {
  const clustersIds = clusters.map((cluster) => cluster.clusterUuid);
  const params = {
    index,
    filterPath: ['aggregations'],
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
            {
              term: {
                type: 'node_stats',
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
                ...getRejectionsType(searchRejections, writeRejections),
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

  const response = await callCluster('search', params);
  const stats: AlertThreadPoolRejectionsStats[] = [];
  const { buckets: clusterBuckets = [] } = response.aggregations.clusters;

  if (!clusterBuckets.length) {
    return stats;
  }

  for (const clusterBucket of clusterBuckets) {
    for (const node of clusterBucket.nodes.buckets) {
      const indexName = get(node, 'index.buckets[0].key', '');
      const searchRejectionsValue = Number(get(node, 'max_search_rejections.value'));
      const writeRejectionsValue = Number(get(node, 'max_write_rejections.value'));
      if (invalidNumberValue(searchRejectionsValue) && invalidNumberValue(writeRejectionsValue)) {
        continue;
      }
      stats.push({
        searchRejections: searchRejectionsValue,
        writeRejections: writeRejectionsValue,
        clusterUuid: clusterBucket.key,
        nodeId: node.key,
        nodeName: get(node, 'name.buckets[0].key') || node.key,
        ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
      });
    }
  }
  return stats;
}
