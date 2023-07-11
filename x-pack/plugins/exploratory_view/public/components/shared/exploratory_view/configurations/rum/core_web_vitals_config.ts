/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteForStatus } from '@elastic/eui';
import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  FILTER_RECORDS,
  LABEL_FIELDS_FILTER,
  REPORT_METRIC_FIELD,
  ReportTypes,
  USE_BREAK_DOWN_COLUMN,
} from '../constants';
import { buildPhraseFilter } from '../utils';
import {
  CLIENT_GEO_COUNTRY_NAME,
  CLS_FIELD,
  FID_FIELD,
  LCP_FIELD,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
  USER_AGENT_VERSION,
  TRANSACTION_URL,
  USER_AGENT_OS_VERSION,
  URL_FULL,
  SERVICE_ENVIRONMENT,
} from '../constants/elasticsearch_fieldnames';
import { CLS_LABEL, FID_LABEL, LCP_LABEL } from '../constants/labels';

export function getCoreWebVitalsConfig({ dataView }: ConfigProps): SeriesConfig {
  const statusPallete = euiPaletteForStatus(3);

  return {
    defaultSeriesType: 'bar_horizontal_percentage_stacked',
    reportType: ReportTypes.CORE_WEB_VITAL,
    seriesTypes: ['bar_horizontal_percentage_stacked'],
    xAxisColumn: {
      sourceField: USE_BREAK_DOWN_COLUMN,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'Good',
      },
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'Average',
      },
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'Poor',
      },
    ],
    hasOperationType: false,
    filterFields: [
      {
        field: TRANSACTION_URL,
        isNegated: false,
      },
      SERVICE_NAME,
      {
        field: USER_AGENT_OS,
        nested: USER_AGENT_OS_VERSION,
      },
      CLIENT_GEO_COUNTRY_NAME,
      USER_AGENT_DEVICE,
      {
        field: USER_AGENT_NAME,
        nested: USER_AGENT_VERSION,
      },
      LABEL_FIELDS_FILTER,
    ],
    breakdownFields: [
      SERVICE_NAME,
      USER_AGENT_NAME,
      USER_AGENT_OS,
      CLIENT_GEO_COUNTRY_NAME,
      USER_AGENT_DEVICE,
      URL_FULL,
    ],
    baseFilters: [
      ...buildPhraseFilter(TRANSACTION_TYPE, 'page-load', dataView),
      ...buildPhraseFilter(PROCESSOR_EVENT, 'transaction', dataView),
    ],
    labels: { ...FieldLabels, [SERVICE_NAME]: 'Web Application' },
    definitionFields: [SERVICE_NAME, SERVICE_ENVIRONMENT],
    metricOptions: [
      {
        id: LCP_FIELD,
        label: LCP_LABEL,
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `${LCP_FIELD} < 2500`,
          },
          {
            language: 'kuery',
            query: `${LCP_FIELD} > 2500 and ${LCP_FIELD} < 4000`,
          },
          {
            language: 'kuery',
            query: `${LCP_FIELD} > 4000`,
          },
        ],
      },
      {
        label: FID_LABEL,
        id: FID_FIELD,
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `${FID_FIELD} < 100`,
          },
          {
            language: 'kuery',
            query: `${FID_FIELD} > 100 and ${FID_FIELD} < 300`,
          },
          {
            language: 'kuery',
            query: `${FID_FIELD} > 300`,
          },
        ],
      },
      {
        label: CLS_LABEL,
        id: CLS_FIELD,
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `${CLS_FIELD} < 0.1`,
          },
          {
            language: 'kuery',
            query: `${CLS_FIELD} > 0.1 and ${CLS_FIELD} < 0.25`,
          },
          {
            language: 'kuery',
            query: `${CLS_FIELD} > 0.25`,
          },
        ],
      },
    ],
    yConfig: [
      { color: statusPallete[0], forAccessor: 'y-axis-column' },
      { color: statusPallete[1], forAccessor: 'y-axis-column-1' },
      { color: statusPallete[2], forAccessor: 'y-axis-column-2' },
    ],
    query: { query: 'transaction.type: "page-load"', language: 'kuery' },
  };
}
