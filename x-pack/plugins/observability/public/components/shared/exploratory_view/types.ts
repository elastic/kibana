/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteOutput } from '@kbn/coloring';
import type { ExistsFilter, PhraseFilter } from '@kbn/es-query';
import type {
  LastValueIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  SeriesType,
  OperationType,
  YConfig,
  MetricState,
} from '@kbn/lens-plugin/public';

import type { PersistableFilter } from '@kbn/lens-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  FieldFormatParams as BaseFieldFormatParams,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { TermsIndexPatternColumn } from '@kbn/lens-plugin/public';
import { FORMULA_COLUMN } from './configurations/constants';

export const ReportViewTypes = {
  dist: 'data-distribution',
  kpi: 'kpi-over-time',
  cwv: 'core-web-vitals',
  mdd: 'device-data-distribution',
  smt: 'single-metric',
  htm: 'heatmap',
} as const;

type ValueOf<T> = T[keyof T];

export type ReportViewTypeId = keyof typeof ReportViewTypes;

export type ReportViewType = ValueOf<typeof ReportViewTypes>;

export interface ColumnFilter {
  language: 'kuery';
  query: string;
}

export interface ParamFilter {
  label: string;
  input: ColumnFilter;
}

export interface MetricOption {
  id: string;
  field?: string;
  label: string;
  description?: string;
  columnType?:
    | 'range'
    | 'operation'
    | 'FILTER_RECORDS'
    | 'TERMS_COLUMN'
    | 'unique_count'
    | typeof FORMULA_COLUMN;
  columnFilters?: ColumnFilter[];
  columnFilter?: ColumnFilter;
  paramFilters?: ParamFilter[];
  timeScale?: string;
  showPercentileAnnotations?: boolean;
  formula?: string;
  metricStateOptions?: Pick<MetricState, 'colorMode' | 'palette' | 'titlePosition' | 'textAlign'>;
  palette?: PaletteOutput;
  format?: 'percent' | 'number';
  emptyAsNull?: boolean;
  timestampField?: string;
}

export interface SeriesConfig {
  reportType: ReportViewType | string;
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
  metricOptions?: Array<
    | MetricOption
    | { id: string; field?: string; label: string; items: MetricOption[]; columnType?: string }
  >;
  labels: Record<string, string>;
  hasOperationType: boolean;
  palette?: PaletteOutput;
  yTitle?: string;
  yConfig?: YConfig[];
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
  showPercentileAnnotations?: boolean;
  color?: string;
}

export interface UrlFilter {
  field: string;
  values?: Array<string | number>;
  notValues?: Array<string | number>;
  wildcards?: string[];
  notWildcards?: string[];
}

export interface ConfigProps {
  dataView?: DataView;
  series?: SeriesUrl;
  spaceId?: string;
}

interface FormatType extends SerializedFieldFormat<FieldFormatParams> {
  id: 'duration' | 'number' | 'bytes' | 'percent';
}

export type AppDataType =
  | 'synthetics'
  | 'ux'
  | 'infra_logs'
  | 'infra_metrics'
  | 'apm'
  | 'mobile'
  | 'alerts';

type InputFormat = 'microseconds' | 'milliseconds' | 'seconds';
type OutputFormat = 'asSeconds' | 'asMilliseconds' | 'humanize' | 'humanizePrecise';

export interface FieldFormatParams extends BaseFieldFormatParams {
  inputFormat?: InputFormat;
  outputFormat?: OutputFormat;
  outputPrecision?: number;
  showSuffix?: boolean;
  useShortSuffix?: boolean;
}

export interface FieldFormat {
  field: string;
  format: FormatType;
}

export interface BuilderItem {
  id: number;
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
}

export type SupportedOperations = 'average' | 'median' | 'sum' | 'unique_count' | 'min' | 'max';

type TermColumnParams = TermsIndexPatternColumn['params'];

export type TermColumnParamsOrderBy = TermColumnParams['orderBy'];
