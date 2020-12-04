/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { PingType, TlsType } from '../ping/ping';

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
      }),
      t.type({
        type: t.string,
      }),
    ]),
  }),
  t.partial({
    tls: TlsType,
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
  }),
]);

export type MonitorSummary = t.TypeOf<typeof MonitorSummaryType>;

export const MonitorSummariesResultType = t.type({
  summaries: t.array(MonitorSummaryType),
});

export type MonitorSummariesResult = t.TypeOf<typeof MonitorSummariesResultType>;

export const FetchMonitorStatesQueryArgsType = t.intersection([
  t.partial({
    pagination: t.string,
    filters: t.string,
    statusFilter: t.string,
    sortField: t.string,
    sortDirection: t.string,
    pageIndex: t.number,
  }),
  t.type({
    dateRangeStart: t.string,
    dateRangeEnd: t.string,
    pageSize: t.number,
  }),
]);

export type FetchMonitorStatesQueryArgs = t.TypeOf<typeof FetchMonitorStatesQueryArgsType>;
