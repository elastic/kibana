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

export function getMonitorPingsConfig({ seriesId }: Props): DataSeries {
  return {
    id: seriesId,
    reportType: 'uptime-pings',
    defaultSeriesType: 'bar_stacked',
    indexPattern: 'df32db00-819e-11eb-87f5-d7da22b1dde3',
    seriesTypes: ['bar_stacked', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumn: {
      operationType: 'count',
      label: 'Monitor pings',
    },
    metricType: false,
    defaultFilters: ['observer.geo.name'],
    breakdowns: ['monitor.status', 'observer.geo.name'],
    filters: [],
    palette: { type: 'palette', name: 'status' },
    reportDefinitions: [
      {
        field: 'monitor.id',
      },
    ],
    labels: { ...FieldLabels },
  };
}
