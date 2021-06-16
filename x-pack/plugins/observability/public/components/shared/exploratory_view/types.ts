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
  FieldBasedIndexPatternColumn,
  SeriesType,
  OperationType,
  YConfig,
} from '../../../../../lens/public';

import { PersistableFilter } from '../../../../../lens/common';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns';
import { ExistsFilter } from '../../../../../../../src/plugins/data/common/es_query/filters';

export const ReportViewTypes = {
  dist: 'data-distribution',
  kpi: 'kpi-over-time',
  cwv: 'core-web-vitals',
} as const;

type ValueOf<T> = T[keyof T];

export type ReportViewTypeId = keyof typeof ReportViewTypes;

export type ReportViewType = ValueOf<typeof ReportViewTypes>;

export interface ColumnFilter {
  language: 'kuery';
  query: string;
}

export interface ReportDefinition {
  field: string;
  required?: boolean;
  custom?: boolean;
  options?: Array<{
    id: string;
    field?: string;
    label: string;
    description?: string;
    columnType?: 'range' | 'operation' | 'FILTER_RECORDS';
    columnFilters?: ColumnFilter[];
  }>;
}

export interface DataSeries {
  reportType: ReportViewType;
  xAxisColumn: Partial<LastValueIndexPatternColumn> | Partial<DateHistogramIndexPatternColumn>;
  yAxisColumns: Array<Partial<FieldBasedIndexPatternColumn>>;

  breakdowns: string[];
  defaultSeriesType: SeriesType;
  defaultFilters: Array<string | { field: string; nested?: string; isNegated?: boolean }>;
  seriesTypes: SeriesType[];
  filters?: PersistableFilter[] | ExistsFilter[];
  reportDefinitions: ReportDefinition[];
  labels: Record<string, string>;
  hasOperationType: boolean;
  palette?: PaletteOutput;
  yTitle?: string;
  yConfig?: YConfig[];
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
  reportType: ReportViewTypeId;
  operationType?: OperationType;
  dataType: AppDataType;
  reportDefinitions?: URLReportDefinition;
}

export interface UrlFilter {
  field: string;
  values?: string[];
  notValues?: string[];
}

export interface ConfigProps {
  indexPattern: IIndexPattern;
}

export type AppDataType = 'synthetics' | 'ux' | 'infra_logs' | 'infra_metrics' | 'apm';

type FormatType = 'duration' | 'number';
type InputFormat = 'microseconds' | 'milliseconds' | 'seconds';
type OutputFormat = 'asSeconds' | 'asMilliseconds' | 'humanize' | 'humanizePrecise';

export interface FieldFormatParams {
  inputFormat: InputFormat;
  outputFormat: OutputFormat;
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
