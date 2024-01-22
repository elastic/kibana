/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { lastValueFrom } from 'rxjs';
import type { DataPublicPluginStart, IKibanaSearchResponse } from '@kbn/data-plugin/public';
import type { LineChartPoint } from './event_rate_chart';
import type { TimeBuckets } from '../../../../../common/services/time_buckets';

type EventRateResponse = IKibanaSearchResponse<
  estypes.SearchResponse<
    unknown,
    {
      eventRate: {
        buckets: Array<{ key: number; doc_count: number }>;
      };
    }
  >
>;

export async function runDocCountSearch(
  dataStart: DataPublicPluginStart,
  index: string,
  timeField: string,
  earliestMs: number,
  latestMs: number,
  timeBuckets: TimeBuckets
): Promise<LineChartPoint[]> {
  const intervalMs = timeBuckets.getInterval().asMilliseconds();
  const resp = await lastValueFrom(
    dataStart.search.search<any, EventRateResponse>({
      params: {
        index,
        body: {
          size: 0,
          query: {
            bool: {
              must: [
                {
                  range: {
                    [timeField]: {
                      gte: earliestMs,
                      lte: latestMs,
                      format: 'epoch_millis',
                    },
                  },
                },
                {
                  match_all: {},
                },
              ],
            },
          },
          aggs: {
            eventRate: {
              date_histogram: {
                field: timeField,
                fixed_interval: `${intervalMs}ms`,
                min_doc_count: 0,
                extended_bounds: {
                  min: earliestMs,
                  max: latestMs,
                },
              },
            },
          },
        },
      },
    })
  );

  if (resp.rawResponse.aggregations === undefined) {
    return [];
  }

  return resp.rawResponse.aggregations.eventRate.buckets.map((b) => ({
    time: b.key,
    value: b.doc_count,
  }));
}
