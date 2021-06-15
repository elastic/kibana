/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from 'kibana/server';
import { AlertCluster, AlertVersions } from '../../../common/types/alerts';
import { ElasticsearchSource, ElasticsearchResponse } from '../../../common/types/es';

export async function fetchElasticsearchVersions(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  index: string,
  size: number
): Promise<AlertVersions[]> {
  const params = {
    index,
    filterPath: [
      'hits.hits._source.cluster_stats.nodes.versions',
      'hits.hits._index',
      'hits.hits._source.cluster_uuid',
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
      collapse: {
        field: 'cluster_uuid',
      },
    },
  };

  const result = await esClient.search<ElasticsearchSource>(params);
  const response: ElasticsearchResponse = result.body as ElasticsearchResponse;
  return (response.hits?.hits ?? []).map((hit) => {
    const versions = hit._source!.cluster_stats?.nodes?.versions ?? [];
    return {
      versions,
      clusterUuid: hit._source!.cluster_uuid,
      ccs: hit._index.includes(':') ? hit._index.split(':')[0] : undefined,
    };
  });
}
