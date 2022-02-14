/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PingType } from '../ping/ping';

export const StateType = t.intersection([
  t.type({
    timestamp: t.string,
    url: t.partial({
      domain: t.string,
      full: t.string,
      path: t.string,
      port: t.number,
      scheme: t.string,
    }),
    summaryPings: t.array(PingType),
    summary: t.partial({
      status: t.string,
      up: t.number,
      down: t.number,
    }),
    monitor: t.intersection([
      t.partial({
        name: t.string,
        duration: t.type({ us: t.number }),
      }),
      t.type({
        type: t.string,
      }),
    ]),
  }),
  t.partial({
    tls: t.partial({
      not_after: t.union([t.string, t.null]),
      not_before: t.union([t.string, t.null]),
    }),
    observer: t.type({
      geo: t.type({
        name: t.array(t.string),
      }),
    }),
    service: t.partial({
      name: t.string,
    }),
  }),
]);

export type MonitorSummaryState = t.TypeOf<typeof StateType>;

export const HistogramPointType = t.type({
  timestamp: t.number,
  up: t.union([t.number, t.undefined]),
  down: t.union([t.number, t.undefined]),
});

export type HistogramPoint = t.TypeOf<typeof HistogramPointType>;

export const HistogramType = t.type({
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
    minInterval: t.number,
    configId: t.string,
  }),
]);

export type MonitorSummary = t.TypeOf<typeof MonitorSummaryType>;

export const MonitorSummariesResultType = t.intersection([
  t.partial({
    totalSummaryCount: t.number,
  }),
  t.type({
    summaries: t.array(MonitorSummaryType),
    prevPagePagination: t.union([t.string, t.null]),
    nextPagePagination: t.union([t.string, t.null]),
  }),
]);

export type MonitorSummariesResult = t.TypeOf<typeof MonitorSummariesResultType>;

export const FetchMonitorStatesQueryArgsType = t.intersection([
  t.partial({
    pagination: t.string,
    filters: t.string,
    statusFilter: t.string,
    query: t.string,
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
