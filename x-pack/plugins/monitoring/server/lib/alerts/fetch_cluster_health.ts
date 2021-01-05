/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertCluster, AlertClusterHealth } from '../../../common/types/alerts';
import { ElasticsearchSource } from '../../../common/types/es';

export async function fetchClusterHealth(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  size: number
): Promise<AlertClusterHealth[]> {
  const params = {
    index,
    filterPath: [
      'hits.hits._source.cluster_state.status',
      'hits.hits._source.cluster_uuid',
      'hits.hits._index',
    ],
    body: {
      size,
      sort: [{ timestamp: { order: 'desc' } }],
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

  const response = await callCluster('search', params);
  return response.hits.hits.map((hit: { _source: ElasticsearchSource; _index: string }) => {
    return {
      health: hit._source.cluster_state?.status,
      clusterUuid: hit._source.cluster_uuid,
      ccs: hit._index.includes(':') ? hit._index.split(':')[0] : undefined,
    } as AlertClusterHealth;
  });
}
