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
} from './data/elasticsearch_fieldnames';

export function getPerformanceDistLensConfig({ seriesId, indexPattern }: ConfigProps): DataSeries {
  return {
    id: seriesId ?? 'unique-key',
    reportType: 'page-load-dist',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: 'performance.metric',
    },
    yAxisColumn: {
      operationType: 'count',
      label: 'Pages loaded',
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
    reportDefinitions: [
      {
        field: SERVICE_NAME,
        required: true,
      },
      {
        field: SERVICE_ENVIRONMENT,
      },
      {
        field: 'performance.metric',
        custom: true,
        defaultValue: TRANSACTION_DURATION,
        options: [
          { label: 'Page load time', field: TRANSACTION_DURATION },
          { label: 'First contentful paint', field: FCP_FIELD },
          { label: 'Total blocking time', field: TBT_FIELD },
          // FIXME, review if we need these descriptions
          { label: 'Largest contentful paint', field: LCP_FIELD, description: 'Core web vital' },
          { label: 'First input delay', field: FID_FIELD, description: 'Core web vital' },
          { label: 'Cumulative layout shift', field: CLS_FIELD, description: 'Core web vital' },
        ],
      },
    ],
    filters: [
      buildPhraseFilter(TRANSACTION_TYPE, 'page-load', indexPattern),
      buildPhraseFilter(PROCESSOR_EVENT, 'transaction', indexPattern),
    ],
    labels: {
      ...FieldLabels,
      [SERVICE_NAME]: 'Web Application',
      [TRANSACTION_DURATION]: 'Page load time',
    },
  };
}
