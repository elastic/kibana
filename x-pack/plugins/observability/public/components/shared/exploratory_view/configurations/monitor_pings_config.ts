/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSeries } from '../types';

interface Props {
  seriesId: string;
  monitorId: string;
}

export function getMonitorPingsConfig({ seriesId, monitorId }: Props): DataSeries {
  return {
    id: seriesId,
    reportType: 'uptime-pings',
    defaultSeriesType: 'line',
    indexPattern: 'df32db00-819e-11eb-87f5-d7da22b1dde3',
    seriesTypes: ['bar', 'bar_stacked'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumn: {
      operationType: 'count',
      label: 'Monitor pings',
    },
    defaultFilters: ['observer.geo.name'],
    breakdowns: ['monitor.status', 'observer.geo.name'],
    filters: monitorId
      ? [
          {
            query: { match_phrase: { 'monitor.id': 'android-homepage' } },
          },
        ]
      : [],
  };
}
