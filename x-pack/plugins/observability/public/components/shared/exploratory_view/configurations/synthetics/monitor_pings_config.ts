/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels } from '../constants';
import { buildExistsFilter } from '../utils';

export function getMonitorPingsConfig({ seriesId, indexPattern }: ConfigProps): DataSeries {
  return {
    id: seriesId,
    reportType: 'uptime-pings',
    defaultSeriesType: 'bar_stacked',
    seriesTypes: ['bar_stacked', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumn: {
      operationType: 'count',
      label: 'Monitor pings',
    },
    hasOperationType: false,
    defaultFilters: ['observer.geo.name'],
    breakdowns: ['monitor.status', 'observer.geo.name', 'monitor.type'],
    filters: buildExistsFilter('summary.down', indexPattern),
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
