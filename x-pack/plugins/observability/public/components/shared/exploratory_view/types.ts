/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PaletteOutput } from 'src/plugins/charts/public';
import {
  LastValueIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  SeriesType,
  OperationType,
  IndexPatternColumn,
} from '../../../../../lens/public';

import { PersistableFilter } from '../../../../../lens/common';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns';

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

export interface ReportDefinition {
  field: string;
  required?: boolean;
  custom?: boolean;
  defaultValue?: string;
  options?: Array<{ field: string; label: string; description?: string }>;
}

export interface DataSeries {
  reportType: ReportViewType;
  id: string;
  xAxisColumn: Partial<LastValueIndexPatternColumn> | Partial<DateHistogramIndexPatternColumn>;
  yAxisColumn: Partial<IndexPatternColumn>;

  breakdowns: string[];
  defaultSeriesType: SeriesType;
  defaultFilters: Array<string | { field: string; nested: string }>;
  seriesTypes: SeriesType[];
  filters?: PersistableFilter[];
  reportDefinitions: ReportDefinition[];
  labels: Record<string, string>;
  hasMetricType: boolean;
  palette?: PaletteOutput;
}

export interface SeriesUrl {
  time: {
    to: string;
    from: string;
  };
  breakdown?: string;
  filters?: UrlFilter[];
  seriesType?: SeriesType;
  reportType: ReportViewTypeId;
  metric?: OperationType;
  dataType?: AppDataType;
  reportDefinitions?: Record<string, string>;
}

export interface UrlFilter {
  field: string;
  values?: string[];
  notValues?: string[];
}

export interface ConfigProps {
  seriesId: string;
  indexPattern: IIndexPattern;
}

export type AppDataType = 'synthetics' | 'rum' | 'logs' | 'metrics' | 'apm';
