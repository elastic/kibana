/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteForStatus } from '@elastic/eui';
import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels, FILTER_RECORDS, USE_BREAK_DOWN_COLUMN } from '../constants';
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

export function getCoreWebVitalsConfig({ indexPattern }: ConfigProps): DataSeries {
  const statusPallete = euiPaletteForStatus(3);

  return {
    defaultSeriesType: 'bar_horizontal_percentage_stacked',
    reportType: 'core-web-vitals',
    seriesTypes: ['bar_horizontal_percentage_stacked'],
    xAxisColumn: {
      sourceField: USE_BREAK_DOWN_COLUMN,
    },
    yAxisColumns: [
      {
        sourceField: 'core.web.vitals',
        label: 'Good',
      },
      {
        sourceField: 'core.web.vitals',
        label: 'Average',
      },
      {
        sourceField: 'core.web.vitals',
        label: 'Poor',
      },
    ],
    hasOperationType: false,
    defaultFilters: [
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
    ],
    breakdowns: [
      SERVICE_NAME,
      USER_AGENT_NAME,
      USER_AGENT_OS,
      CLIENT_GEO_COUNTRY_NAME,
      USER_AGENT_DEVICE,
      URL_FULL,
    ],
    filters: [
      ...buildPhraseFilter(TRANSACTION_TYPE, 'page-load', indexPattern),
      ...buildPhraseFilter(PROCESSOR_EVENT, 'transaction', indexPattern),
    ],
    labels: { ...FieldLabels, [SERVICE_NAME]: 'Web Application' },
    reportDefinitions: [
      {
        field: SERVICE_NAME,
        required: true,
      },
      {
        field: SERVICE_ENVIRONMENT,
      },
      {
        field: 'core.web.vitals',
        custom: true,
        options: [
          {
            id: LCP_FIELD,
            label: 'Largest contentful paint',
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
            label: 'First input delay',
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
            label: 'Cumulative layout shift',
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
      },
    ],
    yConfig: [
      { color: statusPallete[0], forAccessor: 'y-axis-column' },
      { color: statusPallete[1], forAccessor: 'y-axis-column-1' },
      { color: statusPallete[2], forAccessor: 'y-axis-column-2' },
    ],
  };
}
