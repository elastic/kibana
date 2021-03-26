/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../types';
import { FieldLabels } from './constants';
import { buildPhraseFilter } from './utils';

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
    filters: [
      buildPhraseFilter('transaction.type', 'page-load', indexPattern),
      buildPhraseFilter('processor.event', 'transaction', indexPattern),
    ],
    labels: { ...FieldLabels, 'service.name': 'Web Application' },
    reportDefinitions: [
      {
        field: 'service.name',
        required: true,
      },
      {
        field: 'service.environment',
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
