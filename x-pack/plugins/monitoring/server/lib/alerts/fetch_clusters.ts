/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCluster } from '../../alerts/types';

export async function fetchClusters(callCluster: any, index: string): Promise<AlertCluster[]> {
  const params = {
    index,
    filterPath: [
      'hits.hits._source.cluster_settings.cluster.metadata.display_name',
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.cluster_name',
    ],
    body: {
      size: 1000,
      query: {
        bool: {
          filter: [
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
  return get(response, 'hits.hits', []).map((hit: any) => {
    const clusterName: string =
      get(hit, '_source.cluster_settings.cluster.metadata.display_name') ||
      get(hit, '_source.cluster_name') ||
      get(hit, '_source.cluster_uuid');
    return {
      clusterUuid: get(hit, '_source.cluster_uuid'),
      clusterName,
    };
  });
}
