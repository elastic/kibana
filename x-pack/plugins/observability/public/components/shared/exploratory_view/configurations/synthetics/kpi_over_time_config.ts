/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, OPERATION_COLUMN, REPORT_METRIC_FIELD, ReportTypes } from '../constants';
import {
  CLS_LABEL,
  DCL_LABEL,
  DOCUMENT_ONLOAD_LABEL,
  DOWN_LABEL,
  FCP_LABEL,
  LCP_LABEL,
  MONITORS_DURATION_LABEL,
  UP_LABEL,
} from '../constants/labels';
import {
  MONITOR_DURATION_US,
  SYNTHETICS_CLS,
  SYNTHETICS_DCL,
  SYNTHETICS_DOCUMENT_ONLOAD,
  SYNTHETICS_FCP,
  SYNTHETICS_LCP,
} from '../constants/field_names/synthetics';
const SUMMARY_UP = 'summary.up';
const SUMMARY_DOWN = 'summary.down';

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
    breakdownFields: ['observer.geo.name', 'monitor.type', 'monitor.name'],
    baseFilters: [],
    palette: { type: 'palette', name: 'status' },
    definitionFields: ['monitor.name', 'url.full'],
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
        label: LCP_LABEL,
        field: SYNTHETICS_LCP,
        id: SYNTHETICS_LCP,
        columnType: OPERATION_COLUMN,
      },
      {
        label: FCP_LABEL,
        field: SYNTHETICS_FCP,
        id: SYNTHETICS_FCP,
        columnType: OPERATION_COLUMN,
      },
      {
        label: DCL_LABEL,
        field: SYNTHETICS_DCL,
        id: SYNTHETICS_DCL,
        columnType: OPERATION_COLUMN,
      },
      {
        label: DOCUMENT_ONLOAD_LABEL,
        field: SYNTHETICS_DOCUMENT_ONLOAD,
        id: SYNTHETICS_DOCUMENT_ONLOAD,
        columnType: OPERATION_COLUMN,
      },
      {
        label: CLS_LABEL,
        field: SYNTHETICS_CLS,
        id: SYNTHETICS_CLS,
        columnType: OPERATION_COLUMN,
      },
    ],
    labels: { ...FieldLabels },
  };
}
