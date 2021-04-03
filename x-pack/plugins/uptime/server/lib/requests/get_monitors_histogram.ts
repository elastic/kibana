/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryContext } from './search';
import {
  Histogram,
  HistogramPoint,
  MonitorSummariesResult,
} from '../../../common/runtime_types/monitor';
import { UMElasticsearchQueryFn } from '../adapters/framework';
import { GetMonitorStatesParams } from './get_monitor_states';
import { getHistogramInterval } from '../helper/get_histogram_interval';

export const getHistogramForMonitors: UMElasticsearchQueryFn<
  GetMonitorStatesParams,
  MonitorSummariesResult
> = async ({
  uptimeEsClient,
  dateRangeStart,
  dateRangeEnd,
  pagination,
  pageSize,
  filters,
  statusFilter,
  query,
  monitorIds,
}): Promise<{ [key: string]: Histogram }> => {
  statusFilter = statusFilter === null ? undefined : statusFilter;

  const parsedFilters = filters && filters !== '' ? JSON.parse(filters) : null;

  const queryContext = new QueryContext(
    uptimeEsClient,
    dateRangeStart,
    dateRangeEnd,
    pagination,
    parsedFilters,
    pageSize,
    statusFilter,
    query
  );

  const minInterval = getHistogramInterval(
    queryContext.dateRangeStart,
    queryContext.dateRangeEnd,
    12
  );

  const params = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              'summary.down': { gt: 0 },
            },
          },
          {
            terms: {
              'monitor.id': monitorIds,
            },
          },
          {
            range: {
              '@timestamp': {
                gte: queryContext.dateRangeStart,
                lte: queryContext.dateRangeEnd,
              },
            },
          },
        ],
      },
    },
    aggs: {
      histogram: {
        date_histogram: {
          field: '@timestamp',
          // 12 seems to be a good size for performance given
          // long monitor lists of up to 100 on the overview page
          fixed_interval: minInterval + 'ms',
          missing: 0,
        },
        aggs: {
          by_id: {
            terms: {
              field: 'monitor.id',
              size: Math.max(monitorIds.length, 1),
            },
            aggs: {
              totalDown: {
                sum: { field: 'summary.down' },
              },
            },
          },
        },
      },
    },
  };
  const { body: result } = await queryContext.search({ body: params });

  const histoBuckets: any[] = (result.aggregations as any)?.histogram.buckets ?? [];
  const simplified = histoBuckets.map((histoBucket: any): { timestamp: number; byId: any } => {
    const byId: { [key: string]: number } = {};
    histoBucket.by_id.buckets.forEach((idBucket: any) => {
      byId[idBucket.key] = idBucket.totalDown.value;
    });
    return {
      timestamp: parseInt(histoBucket.key, 10),
      byId,
    };
  });

  const histosById: { [key: string]: Histogram } = {};
  monitorIds.forEach((id: string) => {
    const points: HistogramPoint[] = [];
    simplified.forEach((simpleHisto) => {
      points.push({
        timestamp: simpleHisto.timestamp,
        up: undefined,
        down: simpleHisto.byId[id],
      });
    });
    histosById[id] = { points };
  });

  return { histograms: histosById, minInterval };
};
