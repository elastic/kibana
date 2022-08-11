/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, RECORDS_FIELD, ReportTypes } from '../constants';
import { LOG_RATE as LOG_RATE_FIELD } from '../constants/field_names/infra_logs';
import { LOG_RATE as LOG_RATE_LABEL } from '../constants/labels';

export function getLogsKPIConfig(configProps: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.KPI,
    defaultSeriesType: 'bar',
    seriesTypes: [],
    xAxisColumn: {
      label: i18n.translate('xpack.observability.exploratoryView.logs.logRateXAxisLabel', {
        defaultMessage: 'Timestamp',
      }),
      dataType: 'date',
      operationType: 'date_histogram',
      sourceField: '@timestamp',
      isBucketed: true,
      scale: 'interval',
    },
    yAxisColumns: [
      {
        label: i18n.translate('xpack.observability.exploratoryView.logs.logRateYAxisLabel', {
          defaultMessage: 'Log rate per minute',
        }),
        dataType: 'number',
        operationType: 'count',
        isBucketed: false,
        scale: 'ratio',
        sourceField: RECORDS_FIELD,
        timeScale: 'm',
      },
    ],
    hasOperationType: false,
    filterFields: ['agent.type', 'service.type', 'event.dataset'],
    breakdownFields: ['agent.hostname', 'service.type', 'event.dataset'],
    baseFilters: [],
    definitionFields: ['agent.hostname', 'service.type', 'event.dataset'],
    textDefinitionFields: ['message'],
    metricOptions: [
      {
        label: LOG_RATE_LABEL,
        field: RECORDS_FIELD,
        id: LOG_RATE_FIELD,
        columnType: 'unique_count',
      },
    ],
    labels: { ...FieldLabels },
  };
}
