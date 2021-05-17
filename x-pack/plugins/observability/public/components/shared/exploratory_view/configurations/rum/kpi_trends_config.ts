/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels, RECORDS_FIELD } from '../constants';
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

export function getKPITrendsLensConfig({ seriesId, indexPattern }: ConfigProps): DataSeries {
  return {
    id: seriesId,
    defaultSeriesType: 'bar_stacked',
    reportType: 'kpi-trends',
    seriesTypes: ['bar', 'bar_stacked'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        sourceField: 'business.kpi',
        operationType: 'median',
      },
    ],
    hasOperationType: false,
    defaultFilters: [
      {
        field: TRANSACTION_URL,
        isNegated: false,
      },
      USER_AGENT_OS,
      CLIENT_GEO_COUNTRY_NAME,
      USER_AGENT_DEVICE,
      {
        field: USER_AGENT_NAME,
        nested: USER_AGENT_VERSION,
      },
    ],
    breakdowns: [USER_AGENT_NAME, USER_AGENT_OS, CLIENT_GEO_COUNTRY_NAME, USER_AGENT_DEVICE],
    filters: [
      ...buildPhraseFilter(TRANSACTION_TYPE, 'page-load', indexPattern),
      ...buildPhraseFilter(PROCESSOR_EVENT, 'transaction', indexPattern),
    ],
    labels: { ...FieldLabels, [SERVICE_NAME]: WEB_APPLICATION_LABEL },
    reportDefinitions: [
      {
        field: SERVICE_NAME,
        required: true,
      },
      {
        field: SERVICE_ENVIRONMENT,
      },
      {
        field: 'business.kpi',
        custom: true,
        defaultValue: RECORDS_FIELD,
        options: [
          { field: RECORDS_FIELD, label: PAGE_VIEWS_LABEL },
          { label: PAGE_LOAD_TIME_LABEL, field: TRANSACTION_DURATION, columnType: 'operation' },
          {
            label: BACKEND_TIME_LABEL,
            field: TRANSACTION_TIME_TO_FIRST_BYTE,
            columnType: 'operation',
          },
          { label: FCP_LABEL, field: FCP_FIELD, columnType: 'operation' },
          { label: TBT_LABEL, field: TBT_FIELD, columnType: 'operation' },
          { label: LCP_LABEL, field: LCP_FIELD, columnType: 'operation' },
          { label: FID_LABEL, field: FID_FIELD, columnType: 'operation' },
          { label: CLS_LABEL, field: CLS_FIELD, columnType: 'operation' },
        ],
      },
    ],
  };
}
