/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels } from '../constants';

export function getMonitorPingsConfig({ seriesId }: ConfigProps): DataSeries {
  return {
    id: seriesId,
    reportType: 'uptime-pings',
    defaultSeriesType: 'bar_stacked',
    seriesTypes: ['bar_stacked', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        operationType: 'sum',
        sourceField: 'summary.up',
        label: 'Up',
      },
      {
        operationType: 'sum',
        sourceField: 'summary.down',
        label: 'Down',
      },
    ],
    yTitle: 'Pings',
    hasOperationType: false,
    defaultFilters: ['observer.geo.name', 'monitor.type', 'monitor.name', 'monitor.id'],
    breakdowns: ['observer.geo.name', 'monitor.type'],
    filters: [],
    palette: { type: 'palette', name: 'status' },
    reportDefinitions: [
      {
        field: 'monitor.name',
      },
      {
        field: 'monitor.id',
      },
      {
        field: 'url.full',
      },
    ],
    labels: { ...FieldLabels },
  };
}
