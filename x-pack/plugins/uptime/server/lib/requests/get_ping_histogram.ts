/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilterClause } from '../helper';
import { HistogramResult, HistogramQueryResult } from '../../../common/runtime_types';
import { QUERY } from '../../../common/constants';
import { getHistogramInterval } from '../helper/get_histogram_interval';
import { UMElasticsearchQueryFn } from '../adapters/framework';

export interface GetPingHistogramParams {
  /** @member dateRangeStart timestamp bounds */
  from: string;
  /** @member dateRangeEnd timestamp bounds */
  to: string;
  /** @member filters user-defined filters */
  filters?: string;
  /** @member monitorId optional limit to monitorId */
  monitorId?: string;

  bucketSize?: string;
}

export const getPingHistogram: UMElasticsearchQueryFn<
  GetPingHistogramParams,
  HistogramResult
> = async ({ uptimeEsClient, from, to, filters, monitorId, bucketSize }) => {
  const boolFilters = filters ? JSON.parse(filters) : null;
  const additionalFilters = [];
  if (monitorId) {
    additionalFilters.push({ match: { 'monitor.id': monitorId } });
  }
  if (boolFilters) {
    additionalFilters.push(boolFilters);
  }
  const filter = getFilterClause(from, to, additionalFilters);

  const minInterval = getHistogramInterval(from, to, QUERY.DEFAULT_BUCKET_COUNT);

  const params = {
    query: {
      bool: {
        filter: [
          ...filter,
          {
            exists: {
              field: 'summary',
            },
          },
        ],
      },
    },
    size: 0,
    aggs: {
      timeseries: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: bucketSize || minInterval + 'ms',
          missing: 0,
        },
        aggs: {
          down: {
            sum: {
              field: 'summary.down',
            },
          },
          up: {
              sum: {
                field: 'summary.up',
              },
            },
          },
        },
      },
  };

  const { body: result } = await uptimeEsClient.search({ body: params });
  const buckets: HistogramQueryResult[] = result?.aggregations?.timeseries?.buckets ?? [];
  const histogram = buckets.map((bucket) => {
    const x: number = bucket.key;
    const downCount = bucket.down.value || 0;
    const upCount = bucket.up.value || 0;
    return {
      x,
      downCount,
      upCount,
      y: 1,
    };
  });
  return {
    histogram,
    minInterval,
  };
};
