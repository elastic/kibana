/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../types';
import { FieldLabels } from './constants';
import { buildPhraseFilter } from './utils';
import {
  CLIENT_GEO_COUNTRY_NAME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
  USER_AGENT_VERSION,
} from './data/elasticsearch_fieldnames';

export function getKPITrendsLensConfig({ seriesId, indexPattern }: ConfigProps): DataSeries {
  return {
    id: seriesId,
    defaultSeriesType: 'bar_stacked',
    reportType: 'kpi-trends',
    seriesTypes: ['bar', 'bar_stacked'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumn: {
      operationType: 'count',
      label: 'Page views',
    },
    hasMetricType: false,
    defaultFilters: [
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
      buildPhraseFilter(TRANSACTION_TYPE, 'page-load', indexPattern),
      buildPhraseFilter(PROCESSOR_EVENT, 'transaction', indexPattern),
    ],
    labels: { ...FieldLabels, SERVICE_NAME: 'Web Application' },
    reportDefinitions: [
      {
        field: SERVICE_NAME,
        required: true,
      },
      {
        field: SERVICE_ENVIRONMENT,
      },
      {
        field: 'Business.KPI',
        custom: true,
        defaultValue: 'Records',
        options: [
          {
            field: 'Records',
            label: 'Page views',
          },
        ],
      },
    ],
  };
}
