/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, OPERATION_COLUMN, REPORT_METRIC_FIELD } from '../constants';
import { buildExistsFilter } from '../utils';
import { DOWN_LABEL, MONITORS_DURATION_LABEL, UP_LABEL } from '../constants/labels';
import { MONITOR_DURATION_US } from '../constants/field_names/synthetics';
const SUMMARY_UP = 'summary.up';
const SUMMARY_DOWN = 'summary.down';

export function getSyntheticsKPIConfig({ indexPattern }: ConfigProps): SeriesConfig {
  return {
    reportType: 'kpi-over-time',
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
    breakdownFields: ['observer.geo.name', 'monitor.type'],
    baseFilters: [...buildExistsFilter('summary.up', indexPattern)],
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
    ],
    labels: { ...FieldLabels },
  };
}
