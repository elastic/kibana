/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';
import { get } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { StackProductUsage } from '../types';

interface ESIndicesBucket {
  key: string;
}

interface ClusterStats {
  cluster_stats: {
    nodes: {
      count: {
        total: number;
      };
    };
  };
  version: string;
}

export async function fetchESUsage(
  callCluster: ElasticsearchClient,
  clusterUuid: string,
  index: string
): Promise<StackProductUsage> {
  const params: estypes.SearchRequest = {
    index,
    size: 1,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.cluster_stats.nodes.count.total',
      'aggregations.indices.buckets',
    ],
    body: {
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
          must: [
            {
              term: {
                type: {
                  value: 'cluster_stats',
                },
              },
            },
            {
              term: {
                cluster_uuid: {
                  value: clusterUuid,
                },
              },
            },
            {
              range: {
                timestamp: {
                  gte: 'now-1h',
                },
              },
            },
          ],
        },
      },
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: 2,
          },
        },
      },
    },
  };

  const response = await callCluster.search(params);
  const esResponse = response as estypes.SearchResponse<ClusterStats>;
  if (esResponse.hits.hits.length === 0) {
    return {
      count: 0,
      enabled: false,
      metricbeatUsed: false,
    };
  }

  const hit = esResponse.hits.hits[0]._source;
  const count = hit?.cluster_stats.nodes.count.total || 0;
  const buckets = get(esResponse, 'aggregations.indices.buckets', []) as ESIndicesBucket[];
  const metricbeatUsed = Boolean(buckets.find((indexBucket) => indexBucket.key.includes('-mb-')));

  return {
    count,
    enabled: true,
    metricbeatUsed,
  };
}
