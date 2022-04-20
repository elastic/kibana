/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilterClause } from '../helper';
import { GetPingHistogramParams, HistogramResult } from '../../../common/runtime_types';
import { QUERY } from '../../../common/constants';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { createEsQuery } from '../../../common/utils/es_search';
import { getHistogramInterval } from '../../../common/lib/get_histogram_interval';
import { EXCLUDE_RUN_ONCE_FILTER } from '../../../common/constants/client_defaults';

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

  const params = createEsQuery({
    body: {
      query: {
        bool: {
          filter: [
            ...filter,
            {
              exists: {
                field: 'summary',
              },
            },
            EXCLUDE_RUN_ONCE_FILTER,
          ],
          ...(query
            ? {
                minimum_should_match: 1,
                should: [
                  {
                    multi_match: {
                      query: escape(query),
                      type: 'phrase_prefix' as const,
                      fields: ['monitor.id.text', 'monitor.name.text', 'url.full.text'],
                    },
                  },
                ],
              }
            : {}),
        },
      },
      size: 0,
      aggs: {
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: bucketSize || minInterval + 'ms',
            missing: '0',
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
  const buckets = result?.aggregations?.timeseries?.buckets ?? [];

  const histogram = buckets.map((bucket: Pick<typeof buckets[0], 'key' | 'down' | 'up'>) => {
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
