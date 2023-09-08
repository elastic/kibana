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
  RECORDS_FIELD,
  REPORT_METRIC_FIELD,
  PERCENTILE,
  ReportTypes,
} from '../constants';
import { buildPhraseFilter } from '../utils';
import {
  CLIENT_GEO_COUNTRY_NAME,
  CLS_FIELD,
  FCP_FIELD,
  FID_FIELD,
  LCP_FIELD,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TBT_FIELD,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
  USER_AGENT_VERSION,
  TRANSACTION_TIME_TO_FIRST_BYTE,
  TRANSACTION_URL,
} from '../constants/elasticsearch_fieldnames';
import {
  BACKEND_TIME_LABEL,
  CLS_LABEL,
  FCP_LABEL,
  FID_LABEL,
  LCP_LABEL,
  PAGE_LOAD_TIME_LABEL,
  PAGE_VIEWS_LABEL,
  TBT_LABEL,
  WEB_APPLICATION_LABEL,
} from '../constants/labels';

export function getKPITrendsLensConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'bar_stacked',
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
    filterFields: [
      TRANSACTION_URL,
      USER_AGENT_OS,
      CLIENT_GEO_COUNTRY_NAME,
      USER_AGENT_DEVICE,
      {
        field: USER_AGENT_NAME,
        nested: USER_AGENT_VERSION,
      },
      LABEL_FIELDS_FILTER,
    ],
    breakdownFields: [
      USER_AGENT_NAME,
      USER_AGENT_OS,
      CLIENT_GEO_COUNTRY_NAME,
      USER_AGENT_DEVICE,
      PERCENTILE,
      LABEL_FIELDS_BREAKDOWN,
    ],
    baseFilters: [
      ...buildPhraseFilter(TRANSACTION_TYPE, 'page-load', dataView),
      ...buildPhraseFilter(PROCESSOR_EVENT, 'transaction', dataView),
    ],
    labels: { ...FieldLabels, [SERVICE_NAME]: WEB_APPLICATION_LABEL },
    definitionFields: [SERVICE_NAME, SERVICE_ENVIRONMENT],
    metricOptions: [
      { field: RECORDS_FIELD, id: RECORDS_FIELD, label: PAGE_VIEWS_LABEL },
      {
        label: PAGE_LOAD_TIME_LABEL,
        field: TRANSACTION_DURATION,
        id: TRANSACTION_DURATION,
        columnType: OPERATION_COLUMN,
      },
      {
        label: BACKEND_TIME_LABEL,
        field: TRANSACTION_TIME_TO_FIRST_BYTE,
        id: TRANSACTION_TIME_TO_FIRST_BYTE,
        columnType: OPERATION_COLUMN,
      },
      { label: FCP_LABEL, field: FCP_FIELD, id: FCP_FIELD, columnType: OPERATION_COLUMN },
      { label: TBT_LABEL, field: TBT_FIELD, id: TBT_FIELD, columnType: OPERATION_COLUMN },
      { label: LCP_LABEL, field: LCP_FIELD, id: LCP_FIELD, columnType: OPERATION_COLUMN },
      { label: FID_LABEL, field: FID_FIELD, id: FID_FIELD, columnType: OPERATION_COLUMN },
      { label: CLS_LABEL, field: CLS_FIELD, id: CLS_FIELD, columnType: OPERATION_COLUMN },
    ],
  };
}
