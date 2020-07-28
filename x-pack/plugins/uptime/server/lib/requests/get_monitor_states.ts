/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CONTEXT_DEFAULTS, QUERY } from '../../../common/constants';
import { UMElasticsearchQueryFn } from '../adapters';
import { SortOrder, CursorDirection, MonitorSummariesResult } from '../../../common/runtime_types';
import { QueryContext, MonitorSummaryIterator } from './search';
import { HistogramPoint, Histogram } from '../../../common/runtime_types';
import { getHistogramInterval } from '../helper/get_histogram_interval';

export interface CursorPagination {
  cursorKey?: any;
  cursorDirection: CursorDirection;
  sortOrder: SortOrder;
}

export interface GetMonitorStatesParams {
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination?: CursorPagination;
  pageSize: number;
  filters?: string | null;
  statusFilter?: string;
}

// To simplify the handling of the group of pagination vars they're passed back to the client as a string
const jsonifyPagination = (p: any): string | null => {
  if (!p) {
    return null;
  }

  return JSON.stringify(p);
};

// Gets a page of monitor states.
export const getMonitorStates: UMElasticsearchQueryFn<
  GetMonitorStatesParams,
  MonitorSummariesResult
> = async ({
  callES,
  dynamicSettings,
  dateRangeStart,
  dateRangeEnd,
  pagination,
  pageSize,
  filters,
  statusFilter,
}) => {
  pagination = pagination || CONTEXT_DEFAULTS.CURSOR_PAGINATION;
  statusFilter = statusFilter === null ? undefined : statusFilter;

  const queryContext = new QueryContext(
    callES,
    dynamicSettings.heartbeatIndices,
    dateRangeStart,
    dateRangeEnd,
    pagination,
    filters && filters !== '' ? JSON.parse(filters) : null,
    pageSize,
    statusFilter
  );

  const size = Math.min(queryContext.size, QUERY.DEFAULT_AGGS_CAP);

  const iterator = new MonitorSummaryIterator(queryContext);
  const page = await iterator.nextPage(size);

  const histograms = await getHistogramForMonitors(
    queryContext,
    page.monitorSummaries.map((s) => s.monitor_id)
  );

  page.monitorSummaries.forEach((s) => {
    s.histogram = histograms[s.monitor_id];
  });

  return {
    summaries: page.monitorSummaries,
    nextPagePagination: jsonifyPagination(page.nextPagePagination),
    prevPagePagination: jsonifyPagination(page.prevPagePagination),
  };
};

export const getHistogramForMonitors = async (
  queryContext: QueryContext,
  monitorIds: string[]
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
            // 12 seems to be a good size for performance given
            // long monitor lists of up to 100 on the overview page
            fixed_interval:
              getHistogramInterval(queryContext.dateRangeStart, queryContext.dateRangeEnd, 12) +
              'ms',
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
  const result = await queryContext.search(params);

  const histoBuckets: any[] = result.aggregations.histogram.buckets;
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
