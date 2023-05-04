/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import { AlertCluster, AlertClusterHealth } from '../../../common/types/alerts';
import { ElasticsearchSource } from '../../../common/types/es';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { getIndexPatterns, getElasticsearchDataset } from '../cluster/get_index_patterns';
import { CCS_REMOTE_PATTERN } from '../../../common/constants';

export async function fetchClusterHealth(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  filterQuery?: string,
  duration: string = '2m'
): Promise<AlertClusterHealth[]> {
  const indexPatterns = getIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'cluster_stats',
    ccs: CCS_REMOTE_PATTERN,
  });
  const params = {
    index: indexPatterns,
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
            createDatasetFilter(
              'cluster_stats',
              'cluster_stats',
              getElasticsearchDataset('cluster_stats')
            ),
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

  const response = await esClient.search<ElasticsearchSource>(params);
  return (response.hits?.hits ?? []).map((hit) => {
    return {
      health:
        hit._source!.cluster_state?.status || hit._source!.elasticsearch?.cluster?.stats?.status,
      clusterUuid: hit._source!.cluster_uuid || hit._source!.elasticsearch?.cluster?.id,
      ccs: hit._index.includes(':') ? hit._index.split(':')[0] : undefined,
    } as AlertClusterHealth;
  });
}
