/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSeries } from '../types';

export function getMonitorDurationConfig(): DataSeries {
  return {
    name: 'Android homepage',
    id: 'elastic-co',
    dataViewType: 'uptime-duration',
    defaultSeriesType: 'line',
    indexPattern: 'df32db00-819e-11eb-87f5-d7da22b1dde3',
    seriesTypes: ['bar', 'bar_stacked'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumn: {
      operationType: 'avg',
      sourceField: 'monitor.duration.us',
      label: 'Monitor duration',
    },
    defaultFilters: ['observer.geo.name'],
    breakdowns: ['observer.geo.name'],
    filters: {
      query: { match_phrase: { 'monitor.id': 'android-homepage' } },
    },
  };
}
