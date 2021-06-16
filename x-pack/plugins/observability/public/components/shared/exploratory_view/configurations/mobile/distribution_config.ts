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
        label: 'Transactions',
      },
    ],
    hasOperationType: false,
    defaultFilters: [
      'labels.net_connection_carrier_name',
      'labels.device_model',
      'labels.net_connection_type',
      'host.os.platform',
      'host.os.full',
      'service.version',
    ],
    breakdowns: [
      'labels.net_connection_carrier_name',
      'labels.device_model',
      'labels.net_connection_type',
      'host.os.platform',
      'host.os.full',
      'service.version',
      'labels.net_connection_carrier_isoCountryCode',
    ],
    filters: [
      ...buildPhrasesFilter('agent.name', ['iOS/swift', 'open-telemetry/swift'], indexPattern),
    ],
    labels: {
      ...FieldLabels,
      [SERVICE_NAME]: 'Mobile app',
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
            label: 'Response latency',
            field: TRANSACTION_DURATION,
            id: TRANSACTION_DURATION,
            columnType: OPERATION_COLUMN,
          },
          {
            label: 'Memory Usage',
            field: METRIC_SYSTEM_MEMORY_USAGE,
            id: METRIC_SYSTEM_MEMORY_USAGE,
            columnType: OPERATION_COLUMN,
          },
          {
            label: 'CPU Usage',
            field: METRIC_SYSTEM_CPU_USAGE,
            id: METRIC_SYSTEM_CPU_USAGE,
            columnType: OPERATION_COLUMN,
          },
        ],
      },
    ],
  };
}
