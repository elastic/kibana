/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  LABEL_FIELDS_FILTER,
  RECORDS_FIELD,
  REPORT_METRIC_FIELD,
  ReportTypes,
} from '../constants';
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

export function getMobileKPIDistributionConfig({ indexPattern }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.DISTRIBUTION,
    defaultSeriesType: 'bar',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: REPORT_METRIC_FIELD,
    },
    yAxisColumns: [
      {
        sourceField: RECORDS_FIELD,
      },
    ],
    hasOperationType: false,
    filterFields: [...Object.keys(MobileFields), LABEL_FIELDS_FILTER],
    breakdownFields: Object.keys(MobileFields),
    baseFilters: [
      ...buildPhrasesFilter('agent.name', ['iOS/swift', 'open-telemetry/swift'], indexPattern),
    ],
    labels: {
      ...FieldLabels,
      ...MobileFields,
      [SERVICE_NAME]: MOBILE_APP,
    },
    definitionFields: [SERVICE_NAME, SERVICE_ENVIRONMENT],
    metricOptions: [
      {
        label: RESPONSE_LATENCY,
        field: TRANSACTION_DURATION,
        id: TRANSACTION_DURATION,
      },
      {
        label: MEMORY_USAGE,
        field: METRIC_SYSTEM_MEMORY_USAGE,
        id: METRIC_SYSTEM_MEMORY_USAGE,
      },
      {
        label: CPU_USAGE,
        field: METRIC_SYSTEM_CPU_USAGE,
        id: METRIC_SYSTEM_CPU_USAGE,
      },
    ],
  };
}
