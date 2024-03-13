/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, OPERATION_COLUMN, REPORT_METRIC_FIELD, ReportTypes } from '../constants';
import {
  SYSTEM_CPU_PERCENTAGE_FIELD,
  DOCKER_CPU_PERCENTAGE_FIELD,
  K8S_POD_CPU_PERCENTAGE_FIELD,
  SYSTEM_MEMORY_PERCENTAGE_FIELD,
} from '../constants/field_names/infra_metrics';
import {
  DOCKER_CPU_USAGE,
  K8S_POD_CPU_USAGE,
  SYSTEM_CPU_USAGE,
  SYSTEM_MEMORY_USAGE,
} from '../constants/labels';

export function getMetricsKPIConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.KPI,
    defaultSeriesType: 'area',
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
    filterFields: ['agent.type', 'service.type'],
    breakdownFields: ['agent.hostname', 'service.type'],
    baseFilters: [],
    definitionFields: ['agent.hostname', 'service.type'],
    metricOptions: [
      {
        label: SYSTEM_CPU_USAGE,
        field: SYSTEM_CPU_PERCENTAGE_FIELD,
        id: SYSTEM_CPU_PERCENTAGE_FIELD,
        columnType: OPERATION_COLUMN,
      },
      {
        label: SYSTEM_MEMORY_USAGE,
        field: SYSTEM_MEMORY_PERCENTAGE_FIELD,
        id: SYSTEM_MEMORY_PERCENTAGE_FIELD,
        columnType: OPERATION_COLUMN,
      },
      {
        label: DOCKER_CPU_USAGE,
        field: DOCKER_CPU_PERCENTAGE_FIELD,
        id: DOCKER_CPU_PERCENTAGE_FIELD,
        columnType: OPERATION_COLUMN,
      },
      {
        label: K8S_POD_CPU_USAGE,
        field: K8S_POD_CPU_PERCENTAGE_FIELD,
        id: K8S_POD_CPU_PERCENTAGE_FIELD,
        columnType: OPERATION_COLUMN,
      },
    ],
    labels: { ...FieldLabels },
  };
}
