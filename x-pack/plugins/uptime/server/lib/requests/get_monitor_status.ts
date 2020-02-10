/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { INDEX_NAMES } from '../../../common/constants';

export interface GetMonitorStatusParams {
  filters?: string;
  locations: string[];
  numTimes: number;
  timerange: { from: string; to: string };
}

export interface GetMonitorStatusResult {
  monitor_id: string;
  status: string;
  location: string;
  count: number;
}

export const getMonitorStatus: UMElasticsearchQueryFn<
  GetMonitorStatusParams,
  GetMonitorStatusResult[]
> = async ({ callES, filters, locations, numTimes, timerange: { from, to } }) => {
  // today this value is hardcoded. In the future we may support
  // multiple status types for this alert, and this will become a parameter
  const STATUS = 'down';
  const esParams = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                'monitor.status': STATUS,
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: from,
                  lte: to,
                },
              },
            },
          ],
        },
      },
      size: 0,
      aggs: {
        monitors: {
          composite: {
            size: 10000,
            sources: [
              {
                monitor_id: {
                  terms: {
                    field: 'monitor.id',
                  },
                },
              },
              {
                status: {
                  terms: {
                    field: 'monitor.status',
                  },
                },
              },
              {
                location: {
                  terms: {
                    field: 'observer.geo.name',
                    missing_bucket: true,
                  },
                },
              },
            ],
          },
        },
      },
    },
  };
  const result = await callES('search', esParams);
  if (!result.aggregations) {
    return [];
  }
  const monitorBuckets = result?.aggregations?.monitors?.buckets || [];
  return monitorBuckets
    .filter(
      (monitor: any) => monitor?.doc_count > numTimes && locations.includes(monitor?.key?.location)
    )
    .map(({ key, doc_count }: any) => ({ ...key, count: doc_count }));
};
