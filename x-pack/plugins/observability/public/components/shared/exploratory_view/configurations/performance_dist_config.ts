/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../types';
import { FieldLabels } from './constants';
import { buildPhraseFilter } from './utils';

export const TRANSACTION_DURATION = 'transaction.duration.us';
export const FCP_FIELD = 'transaction.marks.agent.firstContentfulPaint';
export const LCP_FIELD = 'transaction.marks.agent.largestContentfulPaint';
export const TBT_FIELD = 'transaction.experience.tbt';
export const FID_FIELD = 'transaction.experience.fid';
export const CLS_FIELD = 'transaction.experience.cls';

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
    metricType: false,
    defaultFilters: [
      'user_agent.os.name',
      'client.geo.country_name',
      'user_agent.device.name',
      {
        field: 'user_agent.name',
        nested: 'user_agent.version',
      },
    ],
    breakdowns: [
      'user_agent.name',
      'user_agent.os.name',
      'client.geo.country_name',
      'user_agent.device.name',
    ],
    reportDefinitions: [
      {
        field: 'service.name',
        required: true,
      },
      {
        field: 'service.environment',
      },
      {
        field: 'performance.metric',
        custom: true,
        defaultValue: TRANSACTION_DURATION,
        options: [
          { label: 'Page load time', field: TRANSACTION_DURATION },
          { label: 'First contentful paint', field: FCP_FIELD },
          { label: 'Total blocking time', field: TBT_FIELD },
          { label: 'Largest contentful paint', field: LCP_FIELD, description: 'Core web vital' },
          { label: 'First input delay', field: FID_FIELD, description: 'Core web vital' },
          { label: 'Cumulative layout shift', field: CLS_FIELD, description: 'Core web vital' },
        ],
      },
    ],
    filters: [
      buildPhraseFilter('transaction.type', 'page-load', indexPattern),
      buildPhraseFilter('processor.event', 'transaction', indexPattern),
    ],
    labels: {
      ...FieldLabels,
      'service.name': 'Web Application',
      [TRANSACTION_DURATION]: 'Page load time',
    },
  };
}
