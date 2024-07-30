/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryStringFilter } from './search/get_query_string_filter';
import { getFilterClause } from '../helper';
import { GetPingHistogramParams, HistogramResult } from '../../../../common/runtime_types';
import { QUERY } from '../../../../common/constants';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { createEsQuery } from '../../../../common/utils/es_search';
import { getHistogramInterval } from '../../../../common/lib/get_histogram_interval';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../common/constants/client_defaults';

export const getPingHistogram: UMElasticsearchQueryFn<
  GetPingHistogramParams,
  HistogramResult
> = async ({
  uptimeEsClient,
  dateStart: from,
  dateEnd: to,
  filters,
  monitorId,
  bucketSize,
  query,
  timeZone,
}) => {
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

  if (query) {
    filter.push(getQueryStringFilter(query));
  }

  const params = createEsQuery({
    body: {
      query: {
        bool: {
          // @ts-expect-error upgrade typescript v5.1.6
          filter: [...filter, SUMMARY_FILTER, EXCLUDE_RUN_ONCE_FILTER],
        },
      },
      size: 0,
      aggs: {
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: bucketSize || minInterval + 'ms',
            missing: '0',
            time_zone: timeZone,
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
    },
  });

  const { body: result } = await uptimeEsClient.search(params, 'getPingsOverTime');
  // @ts-expect-error upgrade typescript v5.1.6
  const buckets = result?.aggregations?.timeseries?.buckets ?? [];

  const histogram = buckets.map((bucket: Pick<(typeof buckets)[0], 'key' | 'down' | 'up'>) => {
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
