/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AvgIndexPatternColumn,
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  LastValueIndexPatternColumn,
} from '../../../../../lens/public';
import {
  BREAK_DOWN,
  FILTERS,
  METRIC_TYPE,
  REPORT_TYPE,
  SERIES_TYPE,
} from './configurations/constants';

export const ReportViewTypes = {
  pld: 'page-load-dist',
  pgv: 'page-views',
  upd: 'uptime-duration',
  upp: 'uptime-pings',
  svl: 'service-latency',
  kpi: 'service-latency',
  tpt: 'service-throughput',
};

export type ReportViewTypeId = keyof typeof ReportViewTypes;

export type ReportViewType =
  | 'page-load-dist'
  | 'page-views'
  | 'uptime-duration'
  | 'uptime-pings'
  | 'service-latency';

export interface DataSeries {
  reportType: ReportViewType;
  indexPattern: string;
  id: string;
  xAxisColumn: Partial<LastValueIndexPatternColumn> | Partial<DateHistogramIndexPatternColumn>;
  yAxisColumn:
    | Partial<LastValueIndexPatternColumn>
    | Partial<CountIndexPatternColumn>
    | Partial<AvgIndexPatternColumn>;
  breakdowns: string[];
  defaultSeriesType: string;
  defaultFilters: string[];
  seriesTypes?: string[];
  filters?: Array<Record<string, any>>;
}

export interface SeriesUrl {
  time: {
    to: string;
    from: string;
  };
  [BREAK_DOWN]?: string;
  [FILTERS]?: UrlFilter[];
  [SERIES_TYPE]?: string;
  [REPORT_TYPE]: ReportViewTypeId;
  serviceName: string;
  [METRIC_TYPE]?: string;
}

export interface UrlFilter {
  field: string;
  values?: string[];
  notValues?: string[];
}

export type AppDataType = 'synthetics' | 'rum' | 'logs' | 'metrics' | 'apm';
