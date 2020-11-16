/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { MonitorSummariesResult } from '../../../common/runtime_types';
import { QueryContext } from './search';
import { HistogramPoint, Histogram } from '../../../common/runtime_types';
import { fetchChunk } from './search/fetch_chunk';
import { MonitorSummaryIterator } from './search/monitor_summary_iterator';

export interface GetMonitorStatesParams {
  dateRangeStart: string;
  dateRangeEnd: string;
  pageSize: number;
  filters?: string | null;
  statusFilter?: string;
  pageIndex: number;
  sortField: string;
  sortDirection: string;
}

// Gets a page of monitor states.
export const getMonitorStates: UMElasticsearchQueryFn<
  GetMonitorStatesParams,
  MonitorSummariesResult
> = async ({
  callES,
  dynamicSettings,
  dateRangeStart,
  dateRangeEnd,
  pageSize,
  pageIndex,
  sortField,
  sortDirection,
  filters,
  statusFilter,
}) => {
  statusFilter = statusFilter === null ? undefined : statusFilter;

  const queryContext = new QueryContext(
    callES,
    dynamicSettings.heartbeatIndices,
    dateRangeStart,
    dateRangeEnd,
    filters && filters !== '' ? JSON.parse(filters) : null,
    pageSize,
    pageIndex,
    statusFilter,
    sortField,
    sortDirection
  );

  const iterator = new MonitorSummaryIterator(queryContext);
  const page = await iterator.nextPage(pageSize);

  return {
    totalMonitors: page.totalMonitors,
    summaries: page.monitorSummaries,
  };
};

export const getHistogramForMonitors = async (
  queryContext: QueryContext,
  monitorIds: string[],
  minInterval: number
): Promise<{ [key: string]: Histogram }> => {
  const params = {
    index: queryContext.heartbeatIndices,
    body: {
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
    },
  };
  const { body: result } = await queryContext.search(params);

  const histoBuckets: any[] = result.aggregations?.histogram.buckets ?? [];

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

  return histosById;
};
