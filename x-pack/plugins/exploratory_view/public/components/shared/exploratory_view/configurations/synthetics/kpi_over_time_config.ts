/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FINAL_SUMMARY_KQL } from './single_metric_config';
import { ColumnFilter, ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  OPERATION_COLUMN,
  REPORT_METRIC_FIELD,
  PERCENTILE,
  ReportTypes,
  FORMULA_COLUMN,
  RECORDS_FIELD,
} from '../constants';
import {
  CLS_LABEL,
  DCL_LABEL,
  DOWN_LABEL,
  FCP_LABEL,
  LCP_LABEL,
  MONITORS_DURATION_LABEL,
  STEP_DURATION_LABEL,
  UP_LABEL,
  PAGE_LOAD_TIME_LABEL,
  NETWORK_TIMINGS_LABEL,
} from '../constants/labels';
import {
  MONITOR_DURATION_US,
  NETWORK_TIMINGS_FIELDS,
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
export function getSyntheticsKPIConfig({ dataView }: ConfigProps): SeriesConfig {
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
    hasOperationType: true,
    filterFields: ['observer.geo.name', 'monitor.type', 'tags', 'url.full'],
    breakdownFields: [
      'observer.geo.name',
      'monitor.type',
      'monitor.name',
      SYNTHETICS_STEP_NAME,
      PERCENTILE,
    ],
    baseFilters: [],
    definitionFields: [
      { field: 'monitor.name', nested: SYNTHETICS_STEP_NAME, singleSelection: true },
      { field: 'url.full', filters: buildExistsFilter('summary.up', dataView) },
    ],
    metricOptions: [
      {
        label: MONITORS_DURATION_LABEL,
        field: MONITOR_DURATION_US,
        id: MONITOR_DURATION_US,
        columnType: OPERATION_COLUMN,
      },
      {
        label: 'Monitor availability',
        id: 'monitor_availability',
        columnType: FORMULA_COLUMN,
        formula: "1- (count(kql='summary.down > 0') / count(kql='summary: *'))",
        columnFilter: {
          language: 'kuery',
          query: FINAL_SUMMARY_KQL,
        },
      },
      {
        label: 'Monitor Errors',
        id: 'monitor_errors',
        columnType: OPERATION_COLUMN,
        field: 'monitor.check_group',
        columnFilters: [
          {
            language: 'kuery',
            query: `summary.down > 0`,
          },
        ],
      },
      {
        label: i18n.translate('xpack.exploratoryView.expView.successful', {
          defaultMessage: 'Successful count',
        }),
        id: 'monitor_successful',
        field: 'monitor.check_group',
        columnType: OPERATION_COLUMN,
        columnFilters: [
          {
            language: 'kuery',
            query: `summary: * and summary.down: 0 and monitor.status: "up"`,
          },
        ],
      },
      {
        label: 'Total runs',
        id: 'total_test_runs',
        field: RECORDS_FIELD,
        columnType: OPERATION_COLUMN,
        columnFilters: [
          {
            language: 'kuery',
            query: `summary: *`,
          },
        ],
      },
      {
        field: SUMMARY_UP,
        id: SUMMARY_UP,
        label: UP_LABEL,
        columnType: OPERATION_COLUMN,
        palette: { type: 'palette', name: 'status' },
      },
      {
        field: SUMMARY_DOWN,
        id: SUMMARY_DOWN,
        label: DOWN_LABEL,
        columnType: OPERATION_COLUMN,
        palette: { type: 'palette', name: 'status' },
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
        columnFilters: getStepMetricColumnFilter(SYNTHETICS_LCP),
      },
      {
        label: FCP_LABEL,
        field: SYNTHETICS_FCP,
        id: SYNTHETICS_FCP,
        columnType: OPERATION_COLUMN,
        columnFilters: getStepMetricColumnFilter(SYNTHETICS_FCP),
      },
      {
        label: DCL_LABEL,
        field: SYNTHETICS_DCL,
        id: SYNTHETICS_DCL,
        columnType: OPERATION_COLUMN,
        columnFilters: getStepMetricColumnFilter(SYNTHETICS_DCL),
      },
      {
        label: PAGE_LOAD_TIME_LABEL,
        field: SYNTHETICS_DOCUMENT_ONLOAD,
        id: SYNTHETICS_DOCUMENT_ONLOAD,
        columnType: OPERATION_COLUMN,
        columnFilters: getStepMetricColumnFilter(SYNTHETICS_DOCUMENT_ONLOAD),
      },
      {
        label: CLS_LABEL,
        field: SYNTHETICS_CLS,
        id: SYNTHETICS_CLS,
        columnType: OPERATION_COLUMN,
        columnFilters: getStepMetricColumnFilter(SYNTHETICS_CLS),
      },
      {
        label: NETWORK_TIMINGS_LABEL,
        id: 'network_timings',
        columnType: OPERATION_COLUMN,
        items: NETWORK_TIMINGS_FIELDS.map((field) => ({
          label: FieldLabels[field] ?? field,
          field,
          id: field,
          columnType: OPERATION_COLUMN,
          columnFilters: getStepMetricColumnFilter(field, 'journey/network_info'),
        })),
      },
    ],
    labels: { ...FieldLabels, [SUMMARY_UP]: UP_LABEL, [SUMMARY_DOWN]: DOWN_LABEL },
  };
}

const getStepMetricColumnFilter = (
  field: string,
  stepType: 'step/metrics' | 'step/end' | 'journey/network_info' = 'step/metrics'
): ColumnFilter[] => {
  return [
    {
      language: 'kuery',
      query: `synthetics.type: ${stepType} and ${field}: * and ${field} > 0`,
    },
  ];
};

const STEP_END_FILTER: ColumnFilter = {
  language: 'kuery',
  query: `synthetics.type: step/end`,
};
