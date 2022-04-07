/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from 'kibana/server';
import { AlertCluster, AlertVersions } from '../../../common/types/alerts';
import { ElasticsearchSource } from '../../../common/types/es';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';

export async function fetchElasticsearchVersions(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  size: number,
  filterQuery?: string
): Promise<AlertVersions[]> {
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'cluster_stats',
    ccs: Globals.app.config.ui.ccs.remotePatterns,
  });
  const params = {
    index: indexPatterns,
    filter_path: [
      'hits.hits._source.cluster_stats.nodes.versions',
      'hits.hits._source.elasticsearch.cluster.stats.nodes.versions',
      'hits.hits._index',
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.elasticsearch.cluster.id',
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

  const response = await esClient.search<ElasticsearchSource>(params);
  return (response.hits?.hits ?? []).map((hit) => {
    const versions =
      hit._source!.cluster_stats?.nodes?.versions ??
      hit._source!.elasticsearch?.cluster?.stats?.nodes?.versions ??
      [];
    return {
      versions,
      clusterUuid: hit._source!.elasticsearch?.cluster?.id || hit._source!.cluster_uuid,
      ccs: hit._index.includes(':') ? hit._index.split(':')[0] : undefined,
    };
  });
}
