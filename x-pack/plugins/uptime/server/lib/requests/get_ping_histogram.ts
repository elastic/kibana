/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
        filter,
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
  };

  const { body: result } = await uptimeEsClient.search({ body: params });
  const buckets: HistogramQueryResult[] = result?.aggregations?.timeseries?.buckets ?? [];
  const histogram = buckets.map((bucket) => {
    const x: number = bucket.key;
    const downCount: number = bucket.down.doc_count;
    const upCount: number = bucket.up.doc_count;
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
