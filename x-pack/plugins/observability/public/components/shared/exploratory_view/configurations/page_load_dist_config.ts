/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSeries } from '../types';
import { FieldLabels } from './constants';

interface Props {
  seriesId: string;
}

export function getPageLoadDistLensConfig({ seriesId }: Props): DataSeries {
  return {
    id: seriesId ?? 'unique-key',
    reportType: 'page-load-dist',
    defaultSeriesType: 'line',
    indexPattern: 'apm_static_index_pattern_id',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: 'transaction.duration.us',
    },
    yAxisColumn: {
      operationType: 'count',
      label: 'Pages loaded',
    },
    metricType: false,
    defaultFilters: [
      'user_agent.name',
      'user_agent.os.name',
      'client.geo.country_name',
      'user_agent.device.name',
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
    ],
    filters: [
      { query: { match_phrase: { 'transaction.type': 'page-load' } } },
      { query: { match_phrase: { 'processor.event': 'transaction' } } },
    ],
    labels: { ...FieldLabels, 'service.name': 'Web Application' },
  };
}
