/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { LegacyAlert, AlertCluster, LegacyAlertMetadata } from '../../alerts/types';

export async function fetchLegacyAlerts(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  watchName: string,
  size: number
): Promise<LegacyAlert[]> {
  const params = {
    index,
    filterPath: [
      'hits.hits._source.prefix',
      'hits.hits._source.message',
      'hits.hits._source.resolved_timestamp',
      'hits.hits._source.nodes',
      'hits.hits._source.metadata.*',
    ],
    body: {
      size,
      sort: [
        {
          timestamp: {
            order: 'desc',
          },
        },
      ],
      query: {
        bool: {
          minimum_should_match: 1,
          filter: [
            {
              terms: {
                'metadata.cluster_uuid': clusters.map((cluster) => cluster.clusterUuid),
              },
            },
            {
              term: {
                'metadata.watch': watchName,
              },
            },
          ],
          should: [
            {
              range: {
                timestamp: {
                  gte: 'now-2m',
                },
              },
            },
            {
              range: {
                resolved_timestamp: {
                  gte: 'now-2m',
                },
              },
            },
            {
              bool: {
                must_not: {
                  exists: {
                    field: 'resolved_timestamp',
                  },
                },
              },
            },
          ],
        },
      },
      collapse: {
        field: 'metadata.cluster_uuid',
      },
    },
  };

  const response = await callCluster('search', params);
  return get(response, 'hits.hits', []).map((hit: any) => {
    const legacyAlert: LegacyAlert = {
      prefix: get(hit, '_source.prefix'),
      message: get(hit, '_source.message'),
      resolved_timestamp: get(hit, '_source.resolved_timestamp'),
      nodes: get(hit, '_source.nodes'),
      metadata: get(hit, '_source.metadata') as LegacyAlertMetadata,
    };
    return legacyAlert;
  });
}
