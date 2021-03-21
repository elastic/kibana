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

import { ESFilter } from '../../../../../../../typings/elasticsearch';

export const ReportViewTypes = {
  pld: 'page-load-dist',
  kpi: 'kpi-trends',
  upd: 'uptime-duration',
  upp: 'uptime-pings',
  svl: 'service-latency',
  tpt: 'service-throughput',
  logs: 'logs-frequency',
  cpu: 'cpu-usage',
  mem: 'memory-usage',
  nwk: 'network-activity',
} as const;

type ValueOf<T> = T[keyof T];

export type ReportViewTypeId = keyof typeof ReportViewTypes;

export type ReportViewType = ValueOf<typeof ReportViewTypes>;

export interface DataSeries {
  reportType: ReportViewType;
  id: string;
  xAxisColumn: Partial<LastValueIndexPatternColumn> | Partial<DateHistogramIndexPatternColumn>;
  yAxisColumn:
    | Partial<LastValueIndexPatternColumn>
    | Partial<CountIndexPatternColumn>
    | Partial<AvgIndexPatternColumn>;
  breakdowns: string[];
  defaultSeriesType: string;
  defaultFilters: Array<string | { field: string; nested: string }>;
  seriesTypes: string[];
  filters?: ESFilter[];
  reportDefinitions: {
    field: string;
    required?: boolean;
    custom?: boolean;
  }[];
  labels: Record<string, string>;
  metricType: boolean;
  palette?: Record<string, string>;
}

export interface SeriesUrl {
  time: {
    to: string;
    from: string;
  };
  breakdown?: string;
  filters?: UrlFilter[];
  seriesType?: string;
  reportType: ReportViewTypeId;
  metric?: string;
  dataType?: AppDataType;
  reportDefinitions?: Record<string, string>;
}

export interface UrlFilter {
  field: string;
  values?: string[];
  notValues?: string[];
}

export type AppDataType = 'synthetics' | 'rum' | 'logs' | 'metrics' | 'apm';
