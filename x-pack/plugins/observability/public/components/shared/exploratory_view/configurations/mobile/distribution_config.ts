/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels, OPERATION_COLUMN, RECORDS_FIELD } from '../constants';
import { buildPhrasesFilter } from '../utils';
import {
  METRIC_SYSTEM_CPU_USAGE,
  METRIC_SYSTEM_MEMORY_USAGE,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
} from '../constants/elasticsearch_fieldnames';

import { CPU_USAGE, MEMORY_USAGE, MOBILE_APP, RESPONSE_LATENCY } from '../constants/labels';
import { MobileFields } from './mobile_fields';

export function getMobileKPIDistributionConfig({ indexPattern }: ConfigProps): DataSeries {
  return {
    reportType: 'data-distribution',
    defaultSeriesType: 'bar',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: 'performance.metric',
    },
    yAxisColumns: [
      {
        sourceField: RECORDS_FIELD,
      },
    ],
    hasOperationType: false,
    defaultFilters: Object.keys(MobileFields),
    breakdowns: Object.keys(MobileFields),
    filters: [
      ...buildPhrasesFilter('agent.name', ['iOS/swift', 'open-telemetry/swift'], indexPattern),
    ],
    labels: {
      ...FieldLabels,
      ...MobileFields,
      [SERVICE_NAME]: MOBILE_APP,
    },
    reportDefinitions: [
      {
        field: SERVICE_NAME,
        required: true,
      },
      {
        field: SERVICE_ENVIRONMENT,
        required: true,
      },
      {
        field: 'performance.metric',
        custom: true,
        options: [
          {
            label: RESPONSE_LATENCY,
            field: TRANSACTION_DURATION,
            id: TRANSACTION_DURATION,
            columnType: OPERATION_COLUMN,
          },
          {
            label: MEMORY_USAGE,
            field: METRIC_SYSTEM_MEMORY_USAGE,
            id: METRIC_SYSTEM_MEMORY_USAGE,
            columnType: OPERATION_COLUMN,
          },
          {
            label: CPU_USAGE,
            field: METRIC_SYSTEM_CPU_USAGE,
            id: METRIC_SYSTEM_CPU_USAGE,
            columnType: OPERATION_COLUMN,
          },
        ],
      },
    ],
  };
}
