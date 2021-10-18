/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnFilter, ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  OPERATION_COLUMN,
  REPORT_METRIC_FIELD,
  PERCENTILE,
  ReportTypes,
} from '../constants';
import {
  CLS_LABEL,
  DCL_LABEL,
  DOCUMENT_ONLOAD_LABEL,
  DOWN_LABEL,
  FCP_LABEL,
  LCP_LABEL,
  MONITORS_DURATION_LABEL,
  STEP_DURATION_LABEL,
  UP_LABEL,
} from '../constants/labels';
import {
  MONITOR_DURATION_US,
  SYNTHETICS_CLS,
  SYNTHETICS_DCL,
  SYNTHETICS_DOCUMENT_ONLOAD,
  SYNTHETICS_FCP,
  SYNTHETICS_LCP,
  SYNTHETICS_STEP_DURATION,
  SYNTHETICS_STEP_NAME,
} from '../constants/field_names/synthetics';
import { buildExistsFilter } from '../utils';
const SUMMARY_UP = 'summary.up';
const SUMMARY_DOWN = 'summary.down';

export const isStepLevelMetric = (metric?: string) => {
  if (!metric) {
    return false;
  }
  return [
    SYNTHETICS_LCP,
    SYNTHETICS_FCP,
    SYNTHETICS_CLS,
    SYNTHETICS_DCL,
    SYNTHETICS_STEP_DURATION,
    SYNTHETICS_DOCUMENT_ONLOAD,
  ].includes(metric);
};
export function getSyntheticsKPIConfig({ indexPattern }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.KPI,
    defaultSeriesType: 'bar_stacked',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'median',
      },
    ],
    hasOperationType: false,
    filterFields: ['observer.geo.name', 'monitor.type', 'tags'],
    breakdownFields: [
      'observer.geo.name',
      'monitor.type',
      'monitor.name',
      SYNTHETICS_STEP_NAME,
      PERCENTILE,
    ],
    baseFilters: [],
    palette: { type: 'palette', name: 'status' },
    definitionFields: [
      { field: 'monitor.name', nested: SYNTHETICS_STEP_NAME, singleSelection: true },
      { field: 'url.full', filters: buildExistsFilter('summary.up', indexPattern) },
    ],
    metricOptions: [
      {
        label: MONITORS_DURATION_LABEL,
        field: MONITOR_DURATION_US,
        id: MONITOR_DURATION_US,
        columnType: OPERATION_COLUMN,
      },
      {
        field: SUMMARY_UP,
        id: SUMMARY_UP,
        label: UP_LABEL,
        columnType: OPERATION_COLUMN,
      },
      {
        field: SUMMARY_DOWN,
        id: SUMMARY_DOWN,
        label: DOWN_LABEL,
        columnType: OPERATION_COLUMN,
      },
      {
        label: STEP_DURATION_LABEL,
        field: SYNTHETICS_STEP_DURATION,
        id: SYNTHETICS_STEP_DURATION,
        columnType: OPERATION_COLUMN,
        columnFilters: [STEP_END_FILTER],
      },
      {
        label: LCP_LABEL,
        field: SYNTHETICS_LCP,
        id: SYNTHETICS_LCP,
        columnType: OPERATION_COLUMN,
        columnFilters: [STEP_METRIC_FILTER],
      },
      {
        label: FCP_LABEL,
        field: SYNTHETICS_FCP,
        id: SYNTHETICS_FCP,
        columnType: OPERATION_COLUMN,
        columnFilters: [STEP_METRIC_FILTER],
      },
      {
        label: DCL_LABEL,
        field: SYNTHETICS_DCL,
        id: SYNTHETICS_DCL,
        columnType: OPERATION_COLUMN,
        columnFilters: [STEP_METRIC_FILTER],
      },
      {
        label: DOCUMENT_ONLOAD_LABEL,
        field: SYNTHETICS_DOCUMENT_ONLOAD,
        id: SYNTHETICS_DOCUMENT_ONLOAD,
        columnType: OPERATION_COLUMN,
        columnFilters: [STEP_METRIC_FILTER],
      },
      {
        label: CLS_LABEL,
        field: SYNTHETICS_CLS,
        id: SYNTHETICS_CLS,
        columnType: OPERATION_COLUMN,
        columnFilters: [STEP_METRIC_FILTER],
      },
    ],
    labels: { ...FieldLabels, [SUMMARY_UP]: UP_LABEL, [SUMMARY_DOWN]: DOWN_LABEL },
  };
}

const STEP_METRIC_FILTER: ColumnFilter = {
  language: 'kuery',
  query: `synthetics.type: step/metrics`,
};

const STEP_END_FILTER: ColumnFilter = {
  language: 'kuery',
  query: `synthetics.type: step/end`,
};
