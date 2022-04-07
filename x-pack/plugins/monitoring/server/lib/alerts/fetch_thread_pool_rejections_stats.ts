/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { get } from 'lodash';
import { AlertCluster, AlertThreadPoolRejectionsStats } from '../../../common/types/alerts';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';

const invalidNumberValue = (value: number) => {
  return isNaN(value) || value === undefined || value === null;
};

const getTopHits = (threadType: string, order: 'asc' | 'desc') => ({
  top_hits: {
    sort: [
      {
        timestamp: {
          order,
          unmapped_type: 'long' as const,
        },
      },
    ],
    _source: {
      includes: [
        `node_stats.thread_pool.${threadType}.rejected`,
        `elasticsearch.node.stats.thread_pool.${threadType}.rejected.count`,
        'source_node.name',
        'elasticsearch.node.name',
      ],
    },
    size: 1,
  },
});

export async function fetchThreadPoolRejectionStats(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  size: number,
  threadType: string,
  duration: string,
  filterQuery?: string
): Promise<AlertThreadPoolRejectionsStats[]> {
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
          },
          aggs: {
            nodes: {
              terms: {
                field: 'source_node.uuid',
                size,
              },
              aggs: {
                most_recent: {
                  ...getTopHits(threadType, 'desc' as const),
                },
                least_recent: {
                  ...getTopHits(threadType, 'asc' as const),
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
  const stats: AlertThreadPoolRejectionsStats[] = [];
  // @ts-expect-error declare type for aggregations explicitly
  const { buckets: clusterBuckets } = response.aggregations?.clusters;

  if (!clusterBuckets?.length) {
    return stats;
  }

  for (const clusterBucket of clusterBuckets) {
    for (const node of clusterBucket.nodes.buckets) {
      const mostRecentDoc = get(node, 'most_recent.hits.hits[0]');
      mostRecentDoc.timestamp = mostRecentDoc.sort[0];

      const leastRecentDoc = get(node, 'least_recent.hits.hits[0]');
      leastRecentDoc.timestamp = leastRecentDoc.sort[0];

      if (!mostRecentDoc || mostRecentDoc.timestamp === leastRecentDoc.timestamp) {
        continue;
      }

      const rejectedPath = `_source.node_stats.thread_pool.${threadType}.rejected`;
      const rejectedPathEcs = `_source.elasticsearch.node.stats.thread_pool.${threadType}.rejected.count`;
      const newRejectionCount =
        Number(get(mostRecentDoc, rejectedPath)) || Number(get(mostRecentDoc, rejectedPathEcs));
      const oldRejectionCount =
        Number(get(leastRecentDoc, rejectedPath)) || Number(get(leastRecentDoc, rejectedPathEcs));

      if (invalidNumberValue(newRejectionCount) || invalidNumberValue(oldRejectionCount)) {
        continue;
      }

      const rejectionCount =
        oldRejectionCount > newRejectionCount
          ? newRejectionCount
          : newRejectionCount - oldRejectionCount;
      const indexName = mostRecentDoc._index;
      const nodeName =
        get(mostRecentDoc, '_source.source_node.name') ||
        get(mostRecentDoc, '_source.elasticsearch.node.name') ||
        node.key;
      const nodeStat = {
        rejectionCount,
        type: threadType,
        clusterUuid: clusterBucket.key,
        nodeId: node.key,
        nodeName,
        ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
      };
      stats.push(nodeStat);
    }
  }
  return stats;
}
