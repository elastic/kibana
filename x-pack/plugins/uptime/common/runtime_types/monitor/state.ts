/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const CheckMonitorType = t.intersection([
  t.partial({
    name: t.string,
    ip: t.union([t.array(t.string), t.string]),
  }),
  t.type({
    status: t.string,
  }),
]);

export const CheckType = t.intersection([
  t.partial({
    agent: t.partial({
      id: t.string,
    }),
    container: t.type({
      id: t.string,
    }),
    kubernetes: t.type({
      pod: t.type({
        uid: t.string,
      }),
    }),
    observer: t.type({
      geo: t.partial({
        name: t.string,
        location: t.partial({
          lat: t.number,
          lon: t.number,
        }),
      }),
    }),
  }),
  t.type({
    monitor: CheckMonitorType,
    timestamp: t.number,
  }),
]);

export type Check = t.TypeOf<typeof CheckType>;

export const StateType = t.intersection([
  t.partial({
    checks: t.array(CheckType),
    observer: t.partial({
      geo: t.partial({
        name: t.array(t.string),
      }),
    }),
    summary: t.partial({
      up: t.number,
      down: t.number,
      geo: t.partial({
        name: t.string,
        location: t.partial({
          lat: t.number,
          lon: t.number,
        }),
      }),
    }),
  }),
  t.type({
    timestamp: t.string,
    url: t.partial({
      domain: t.string,
      full: t.string,
      path: t.string,
      port: t.number,
      scheme: t.string,
    }),
  }),
]);

export const HistogramPointType = t.type({
  timestamp: t.number,
  up: t.number,
  down: t.number,
});

export type HistogramPoint = t.TypeOf<typeof HistogramPointType>;

export const HistogramType = t.type({
  count: t.number,
  points: t.array(HistogramPointType),
});

export type Histogram = t.TypeOf<typeof HistogramType>;

export const MonitorSummaryType = t.intersection([
  t.type({
    monitor_id: t.string,
    state: StateType,
  }),
  t.partial({
    histogram: HistogramType,
  }),
]);

export type MonitorSummary = t.TypeOf<typeof MonitorSummaryType>;

export const MonitorSummaryResultType = t.intersection([
  t.partial({
    summaries: t.array(MonitorSummaryType),
  }),
  t.type({
    prevPagePagination: t.union([t.string, t.null]),
    nextPagePagination: t.union([t.string, t.null]),
    totalSummaryCount: t.number,
  }),
]);

export type MonitorSummaryResult = t.TypeOf<typeof MonitorSummaryResultType>;

export const FetchMonitorStatesQueryArgsType = t.intersection([
  t.partial({
    pagination: t.string,
    filters: t.string,
    statusFilter: t.string,
  }),
  t.type({
    dateRangeStart: t.string,
    dateRangeEnd: t.string,
    pageSize: t.number,
  }),
]);

export type FetchMonitorStatesQueryArgs = t.TypeOf<typeof FetchMonitorStatesQueryArgsType>;

export enum CursorDirection {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
