/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PaletteOutput } from 'src/plugins/charts/public';
import { ExistsFilter, PhraseFilter } from '@kbn/es-query';
import {
  LastValueIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  SeriesType,
  OperationType,
  YLensConfig,
} from '../../../../../lens/public';

import { PersistableFilter } from '../../../../../lens/common';
import type { DataView } from '../../../../../../../src/plugins/data_views/common';

export const ReportViewTypes = {
  dist: 'data-distribution',
  kpi: 'kpi-over-time',
  cwv: 'core-web-vitals',
  mdd: 'device-data-distribution',
} as const;

type ValueOf<T> = T[keyof T];

export type ReportViewTypeId = keyof typeof ReportViewTypes;

export type ReportViewType = ValueOf<typeof ReportViewTypes>;

export interface ColumnFilter {
  language: 'kuery';
  query: string;
}

export interface MetricOption {
  id: string;
  field?: string;
  label: string;
  description?: string;
  columnType?: 'range' | 'operation' | 'FILTER_RECORDS' | 'TERMS_COLUMN' | 'unique_count';
  columnFilters?: ColumnFilter[];
  timeScale?: string;
}

export interface SeriesConfig {
  reportType: ReportViewType;
  xAxisColumn: Partial<LastValueIndexPatternColumn> | Partial<DateHistogramIndexPatternColumn>;
  yAxisColumns: Array<Partial<FieldBasedIndexPatternColumn>>;
  breakdownFields: string[];
  defaultSeriesType: SeriesType;
  filterFields: Array<string | { field: string; nested?: string; isNegated?: boolean }>;
  seriesTypes: SeriesType[];
  baseFilters?: Array<PersistableFilter | ExistsFilter | PhraseFilter>;
  definitionFields: Array<
    | string
    | {
        field: string;
        nested?: string;
        singleSelection?: boolean;
        filters?: Array<PersistableFilter | ExistsFilter | PhraseFilter>;
      }
  >;
  textDefinitionFields?: string[];
  metricOptions?: MetricOption[];
  labels: Record<string, string>;
  hasOperationType: boolean;
  palette?: PaletteOutput;
  yTitle?: string;
  yConfig?: YLensConfig[];
  query?: { query: string; language: 'kuery' };
}

export type URLReportDefinition = Record<string, string[]>;
export type URLTextReportDefinition = Record<string, string>;

export interface SeriesUrl {
  name: string;
  time: {
    to: string;
    from: string;
  };
  breakdown?: string;
  filters?: UrlFilter[];
  seriesType?: SeriesType;
  operationType?: OperationType;
  dataType: AppDataType;
  reportDefinitions?: URLReportDefinition;
  textReportDefinitions?: URLTextReportDefinition;
  selectedMetricField?: string;
  hidden?: boolean;
  color?: string;
}

export interface UrlFilter {
  field: string;
  values?: string[];
  notValues?: string[];
  wildcards?: string[];
  notWildcards?: string[];
}

export interface ConfigProps {
  dataView: DataView;
  series?: SeriesUrl;
}

export type AppDataType = 'synthetics' | 'ux' | 'infra_logs' | 'infra_metrics' | 'apm' | 'mobile';

type FormatType = 'duration' | 'number' | 'bytes' | 'percent';
type InputFormat = 'microseconds' | 'milliseconds' | 'seconds';
type OutputFormat = 'asSeconds' | 'asMilliseconds' | 'humanize' | 'humanizePrecise';

export interface FieldFormatParams {
  inputFormat?: InputFormat;
  outputFormat?: OutputFormat;
  outputPrecision?: number;
  showSuffix?: boolean;
  useShortSuffix?: boolean;
}

export interface FieldFormat {
  field: string;
  format: {
    id: FormatType;
    params: FieldFormatParams;
  };
}

export interface BuilderItem {
  id: number;
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
}
