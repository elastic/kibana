/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels, OPERATION_COLUMN } from '../constants';
import { buildPhraseFilter } from '../utils';
import {
  METRIC_SYSTEM_CPU_USAGE,
  METRIC_SYSTEM_MEMORY_USAGE,
  SERVICE_NAME,
  TRANSACTION_DURATION,
} from '../constants/elasticsearch_fieldnames';

export function getMobileKPIConfig({ seriesId, indexPattern }: ConfigProps): DataSeries {
  return {
    id: seriesId,
    reportType: 'service-latency',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar'],
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
    filters: [...buildPhraseFilter('agent.name', 'iOS/swift', indexPattern)],
    labels: {
      ...FieldLabels,
      [TRANSACTION_DURATION]: 'Response latency',
      [SERVICE_NAME]: 'Mobile app',
      [METRIC_SYSTEM_MEMORY_USAGE]: 'Memory usage',
      [METRIC_SYSTEM_CPU_USAGE]: 'CPU usage',
    },
    reportDefinitions: [
      {
        field: SERVICE_NAME,
        required: true,
      },
      {
        field: 'business.kpi',
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
