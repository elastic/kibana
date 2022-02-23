/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from 'kibana/server';
import { AlertCluster, AlertClusterHealth } from '../../../common/types/alerts';
import { ElasticsearchSource, ElasticsearchResponse } from '../../../common/types/es';
import { createDatasetFilter } from './create_dataset_query_filter';

export async function fetchClusterHealth(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  index: string,
  filterQuery?: string
): Promise<AlertClusterHealth[]> {
  const params = {
    index,
    filter_path: [
      'hits.hits._source.cluster_state.status',
      'hits.hits._source.elasticsearch.cluster.stats.status',
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.elasticsearch.cluster.id',
      'hits.hits._index',
    ],
    body: {
      size: clusters.length,
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
            {
              terms: {
                cluster_uuid: clusters.map((cluster) => cluster.clusterUuid),
              },
            },
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
      collapse: {
        field: 'cluster_uuid',
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

  const result = await esClient.search<ElasticsearchSource>(params);
  const response: ElasticsearchResponse = result.body as ElasticsearchResponse;
  return (response.hits?.hits ?? []).map((hit) => {
    return {
      health:
        hit._source!.cluster_state?.status || hit._source!.elasticsearch?.cluster?.stats?.status,
      clusterUuid: hit._source!.cluster_uuid || hit._source!.elasticsearch?.cluster?.id,
      ccs: hit._index.includes(':') ? hit._index.split(':')[0] : undefined,
    } as AlertClusterHealth;
  });
}
