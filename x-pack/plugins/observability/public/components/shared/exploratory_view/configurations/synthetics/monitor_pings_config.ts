/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels } from '../constants';
import { buildExistsFilter } from '../utils';
import { DOWN_LABEL, UP_LABEL } from '../constants/labels';

export function getMonitorPingsConfig({ seriesId, indexPattern }: ConfigProps): DataSeries {
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
        label: UP_LABEL,
      },
      {
        operationType: 'sum',
        sourceField: 'summary.down',
        label: DOWN_LABEL,
      },
    ],
    yTitle: 'Pings',
    hasOperationType: false,
    defaultFilters: ['observer.geo.name', 'monitor.type', 'tags'],
    breakdowns: ['observer.geo.name', 'monitor.type'],
    filters: [...buildExistsFilter('summary.up', indexPattern)],
    palette: { type: 'palette', name: 'status' },
    reportDefinitions: [
      {
        field: 'monitor.name',
      },
      {
        field: 'url.full',
      },
    ],
    labels: { ...FieldLabels },
  };
}
