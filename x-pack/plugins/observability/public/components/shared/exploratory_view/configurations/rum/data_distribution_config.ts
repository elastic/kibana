/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  REPORT_METRIC_FIELD,
  RECORDS_PERCENTAGE_FIELD,
  ReportTypes,
  LABEL_FIELDS_FILTER,
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
  TRANSACTION_TIME_TO_FIRST_BYTE,
  TRANSACTION_TYPE,
  TRANSACTION_URL,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
  USER_AGENT_VERSION,
} from '../constants/elasticsearch_fieldnames';
import {
  BACKEND_TIME_LABEL,
  CLS_LABEL,
  FCP_LABEL,
  FID_LABEL,
  LCP_LABEL,
  PAGE_LOAD_TIME_LABEL,
  PAGES_LOADED_LABEL,
  TBT_LABEL,
  WEB_APPLICATION_LABEL,
} from '../constants/labels';

export function getRumDistributionConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.DISTRIBUTION,
    defaultSeriesType: 'line',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: REPORT_METRIC_FIELD,
    },
    yAxisColumns: [
      {
        sourceField: RECORDS_PERCENTAGE_FIELD,
        label: PAGES_LOADED_LABEL,
      },
    ],
    hasOperationType: false,
    filterFields: [
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
      LABEL_FIELDS_FILTER,
    ],
    breakdownFields: [USER_AGENT_NAME, USER_AGENT_OS, CLIENT_GEO_COUNTRY_NAME, USER_AGENT_DEVICE],
    definitionFields: [SERVICE_NAME, SERVICE_ENVIRONMENT],
    metricOptions: [
      { label: PAGE_LOAD_TIME_LABEL, id: TRANSACTION_DURATION, field: TRANSACTION_DURATION },
      {
        label: BACKEND_TIME_LABEL,
        id: TRANSACTION_TIME_TO_FIRST_BYTE,
        field: TRANSACTION_TIME_TO_FIRST_BYTE,
      },
      { label: FCP_LABEL, id: FCP_FIELD, field: FCP_FIELD },
      { label: TBT_LABEL, id: TBT_FIELD, field: TBT_FIELD },
      { label: LCP_LABEL, id: LCP_FIELD, field: LCP_FIELD },
      { label: FID_LABEL, id: FID_FIELD, field: FID_FIELD },
      { label: CLS_LABEL, id: CLS_FIELD, field: CLS_FIELD },
    ],
    baseFilters: [
      ...buildPhraseFilter(TRANSACTION_TYPE, 'page-load', dataView),
      ...buildPhraseFilter(PROCESSOR_EVENT, 'transaction', dataView),
    ],
    labels: {
      ...FieldLabels,
      [SERVICE_NAME]: WEB_APPLICATION_LABEL,
      [TRANSACTION_DURATION]: PAGE_LOAD_TIME_LABEL,
    },
    // rum page load transactions are always less then 60 seconds
    query: { query: 'transaction.duration.us < 60000000', language: 'kuery' },
  };
}
