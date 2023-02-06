/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  RECORDS_FIELD,
  REPORT_METRIC_FIELD,
  REPORT_METRIC_TIMESTAMP,
  ReportTypes,
} from '../constants';

export function getAlertsKPIConfig({ spaceId }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.KPI,
    defaultSeriesType: 'line',
    seriesTypes: [],
    xAxisColumn: {
      label: i18n.translate('xpack.observability.exploratoryView.alerts.alertStarted', {
        defaultMessage: 'Timestamp',
      }),
      dataType: 'date',
      operationType: 'date_histogram',
      isBucketed: true,
      scale: 'interval',
      sourceField: REPORT_METRIC_TIMESTAMP,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'count',
      },
    ],
    hasOperationType: false,
    filterFields: ['kibana.alert.rule.name', 'kibana.alert.status'],
    breakdownFields: ['kibana.alert.rule.category', 'kibana.alert.status'],
    baseFilters: [],
    definitionFields: ['kibana.alert.rule.category'],
    metricOptions: [
      {
        label: 'Total alerts',
        field: RECORDS_FIELD,
        id: 'Alerts',
        columnType: 'unique_count',
        timestampField: 'kibana.alert.start',
      },
      {
        label: 'Recovered alerts',
        field: RECORDS_FIELD,
        id: 'recovered_alerts',
        columnType: 'unique_count',
        timestampField: 'kibana.alert.end',
      },
    ],
    labels: { ...FieldLabels },
    query: {
      language: 'kuery',
      query: `kibana.space_ids: "${spaceId}"`,
    },
  };
}
