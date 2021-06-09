/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels } from '../constants';
import { buildExistsFilter } from '../utils';
import { MONITORS_DURATION_LABEL } from '../constants/labels';

export function getMonitorDurationConfig({ seriesId, indexPattern }: ConfigProps): DataSeries {
  return {
    id: seriesId,
    reportType: 'uptime-duration',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar_stacked'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        operationType: 'average',
        sourceField: 'monitor.duration.us',
        label: MONITORS_DURATION_LABEL,
      },
    ],
    hasOperationType: true,
    defaultFilters: ['monitor.type', 'observer.geo.name', 'tags'],
    breakdowns: [
      'observer.geo.name',
      'monitor.name',
      'monitor.id',
      'monitor.type',
      'tags',
      'url.port',
    ],
    filters: [...buildExistsFilter('summary.up', indexPattern)],
    reportDefinitions: [
      {
        field: 'monitor.name',
      },
      {
        field: 'url.full',
      },
    ],
    labels: { ...FieldLabels, 'monitor.duration.us': MONITORS_DURATION_LABEL },
  };
}
