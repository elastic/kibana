/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCluster, AlertVersions } from '../../alerts/types';

export async function fetchElasticsearchVersions(
  callCluster: any,
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
      size: 1,
      sort: [
        {
          timestamp: {
            order: 'desc',
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

  const response = await callCluster('search', params);
  return get(response, 'hits.hits', []).map((hit) => {
    const indexName = get(hit, '_index', '');
    const versions = get(hit, '_source.cluster_stats.nodes.versions', []) as string[];
    return {
      versions,
      clusterUuid: get(hit, '_source.cluster_uuid', ''),
      ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
    };
  });
}
