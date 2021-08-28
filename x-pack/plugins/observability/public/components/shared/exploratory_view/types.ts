/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExistsFilter } from '@kbn/es-query';
import type { PaletteOutput } from '../../../../../../../src/plugins/charts/common/palette';
import { IndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import type { YConfig } from '../../../../../lens/common/expressions/xy_chart/axis_config';
import type { SeriesType } from '../../../../../lens/common/expressions/xy_chart/series_type';
import type { PersistableFilter } from '../../../../../lens/common/types';
import type {
  FieldBasedIndexPatternColumn,
  OperationType,
} from '../../../../../lens/public/indexpattern_datasource/operations/definitions';
import type { DateHistogramIndexPatternColumn } from '../../../../../lens/public/indexpattern_datasource/operations/definitions/date_histogram';
import type { LastValueIndexPatternColumn } from '../../../../../lens/public/indexpattern_datasource/operations/definitions/last_value';

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
  columnType?: 'range' | 'operation' | 'FILTER_RECORDS' | 'TERMS_COLUMN';
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
  baseFilters?: PersistableFilter[] | ExistsFilter[];
  definitionFields: string[];
  metricOptions?: MetricOption[];
  labels: Record<string, string>;
  hasOperationType: boolean;
  palette?: PaletteOutput;
  yTitle?: string;
  yConfig?: YConfig[];
  query?: { query: string; language: 'kuery' };
}

export type URLReportDefinition = Record<string, string[]>;

export interface SeriesUrl {
  time: {
    to: string;
    from: string;
  };
  breakdown?: string;
  filters?: UrlFilter[];
  seriesType?: SeriesType;
  reportType: ReportViewType;
  operationType?: OperationType;
  dataType: AppDataType;
  reportDefinitions?: URLReportDefinition;
  selectedMetricField?: string;
  isNew?: boolean;
}

export interface UrlFilter {
  field: string;
  values?: string[];
  notValues?: string[];
}

export interface ConfigProps {
  indexPattern: IndexPattern;
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
