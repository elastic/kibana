/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSeries } from '../types';
import { FieldLabels } from './constants';
import { OperationType } from '../../../../../../lens/public';

interface Props {
  seriesId: string;
}

export function getMonitorDurationConfig({ seriesId }: Props): DataSeries {
  return {
    id: seriesId,
    reportType: 'uptime-duration',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar_stacked'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumn: {
      operationType: 'avg' as OperationType,
      sourceField: 'monitor.duration.us',
      label: 'Monitor duration (ms)',
    },
    hasMetricType: true,
    defaultFilters: ['monitor.type', 'observer.geo.name', 'tags'],
    breakdowns: [
      'observer.geo.name',
      'monitor.name',
      'monitor.id',
      'monitor.type',
      'tags',
      'url.port',
    ],
    filters: [],
    reportDefinitions: [
      {
        field: 'monitor.id',
      },
    ],
    labels: { ...FieldLabels },
  };
}
