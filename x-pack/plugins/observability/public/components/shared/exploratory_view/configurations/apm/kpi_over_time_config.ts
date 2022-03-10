/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  LABEL_FIELDS_BREAKDOWN,
  LABEL_FIELDS_FILTER,
  OPERATION_COLUMN,
  REPORT_METRIC_FIELD,
  PERCENTILE,
  ReportTypes,
} from '../constants';
import { buildPhraseFilter } from '../utils';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
  TRANSACTION_URL,
} from '../constants/elasticsearch_fieldnames';

export function getAPMKPITrendsLensConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'area_stacked',
    seriesTypes: [],
    reportType: ReportTypes.KPI,
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
    filterFields: [TRANSACTION_URL, LABEL_FIELDS_FILTER],
    breakdownFields: [PERCENTILE, LABEL_FIELDS_BREAKDOWN],
    baseFilters: [
      ...buildPhraseFilter(TRANSACTION_TYPE, 'request', dataView),
      ...buildPhraseFilter(PROCESSOR_EVENT, 'transaction', dataView),
    ],
    labels: { ...FieldLabels, [SERVICE_NAME]: 'Service name' },
    definitionFields: [SERVICE_NAME, SERVICE_ENVIRONMENT],
    metricOptions: [
      {
        label: 'Request latency',
        field: TRANSACTION_DURATION,
        id: TRANSACTION_DURATION,
        columnType: OPERATION_COLUMN,
      },
    ],
  };
}
