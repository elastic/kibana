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
import {
  CPU_USAGE,
  MEMORY_USAGE,
  MOBILE_APP,
  RESPONSE_LATENCY,
  TRANSACTIONS_PER_MINUTE,
} from '../constants/labels';
import { MobileFields } from './mobile_fields';

export function getMobileKPIConfig({ indexPattern }: ConfigProps): DataSeries {
  return {
    reportType: 'kpi-over-time',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar', 'area'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        sourceField: 'business.kpi',
        operationType: 'median',
      },
    ],
    hasOperationType: true,
    defaultFilters: Object.keys(MobileFields),
    breakdowns: Object.keys(MobileFields),
    filters: [
      ...buildPhrasesFilter('agent.name', ['iOS/swift', 'open-telemetry/swift'], indexPattern),
    ],
    labels: {
      ...FieldLabels,
      ...MobileFields,
      [TRANSACTION_DURATION]: RESPONSE_LATENCY,
      [SERVICE_NAME]: MOBILE_APP,
      [METRIC_SYSTEM_MEMORY_USAGE]: MEMORY_USAGE,
      [METRIC_SYSTEM_CPU_USAGE]: CPU_USAGE,
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
        field: 'business.kpi',
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
          {
            field: RECORDS_FIELD,
            id: RECORDS_FIELD,
            label: TRANSACTIONS_PER_MINUTE,
            columnFilters: [
              {
                language: 'kuery',
                query: `processor.event: transaction`,
              },
            ],
            timeScale: 'm',
          },
        ],
      },
    ],
  };
}
