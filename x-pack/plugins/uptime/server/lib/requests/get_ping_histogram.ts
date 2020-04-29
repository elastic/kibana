/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { getFilterClause } from '../helper';
import { HistogramResult, HistogramQueryResult } from '../../../common/runtime_types';
import { QUERY } from '../../../common/constants';

export interface GetPingHistogramParams {
  /** @member dateRangeStart timestamp bounds */
  from: string;
  /** @member dateRangeEnd timestamp bounds */
  to: string;
  /** @member filters user-defined filters */
  filters?: string | null;
  /** @member monitorId optional limit to monitorId */
  monitorId?: string | null;
  /** @member statusFilter special filter targeting the latest status of each monitor */
  statusFilter?: string | null;
}

export const getPingHistogram: UMElasticsearchQueryFn<
  GetPingHistogramParams,
  HistogramResult
> = async ({ callES, dynamicSettings, from, to, filters, monitorId, statusFilter }) => {
  const boolFilters = filters ? JSON.parse(filters) : null;
  const additionalFilters = [];
  if (monitorId) {
    additionalFilters.push({ match: { 'monitor.id': monitorId } });
  }
  if (boolFilters) {
    additionalFilters.push(boolFilters);
  }
  const filter = getFilterClause(from, to, additionalFilters);

  const params = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      aggs: {
        timeseries: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: QUERY.DEFAULT_BUCKET_COUNT,
          },
          aggs: {
            down: {
              filter: {
                term: {
                  'monitor.status': 'down',
                },
              },
            },
            up: {
              filter: {
                term: {
                  'monitor.status': 'up',
                },
              },
            },
          },
        },
      },
    },
  };

  const result = await callES('search', params);
  const interval = result.aggregations?.timeseries?.interval;
  const buckets: HistogramQueryResult[] = result?.aggregations?.timeseries?.buckets ?? [];
  const histogram = buckets.map(bucket => {
    const x: number = bucket.key;
    const downCount: number = bucket.down.doc_count;
    const upCount: number = bucket.up.doc_count;
    return {
      x,
      downCount: statusFilter && statusFilter !== 'down' ? 0 : downCount,
      upCount: statusFilter && statusFilter !== 'up' ? 0 : upCount,
      y: 1,
    };
  });
  return {
    histogram,
    interval,
  };
};
