/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCommonCluster, AlertClusterState } from '../../alerts/types';

export async function fetchClusterState(
  callCluster: any,
  clusters: AlertCommonCluster[],
  index: string
): Promise<AlertClusterState[]> {
  const params = {
    index,
    filterPath: ['hits.hits._source.cluster_state.status', 'hits.hits._source.cluster_uuid'],
    body: {
      size: 1,
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
    },
  };

  const response = await callCluster('search', params);
  return get<any>(response, 'hits.hits', []).map((hit: any) => {
    return {
      state: get(hit, '_source.cluster_state.status'),
      clusterUuid: get(hit, '_source.cluster_uuid'),
    };
  });
}
