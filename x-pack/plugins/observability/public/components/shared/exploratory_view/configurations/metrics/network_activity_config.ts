/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSeries, ConfigProps } from '../../types';
import { FieldLabels } from '../constants';

export function getNetworkActivityLensConfig({}: ConfigProps): DataSeries {
  return {
    reportType: 'kpi-over-time',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        operationType: 'average',
        sourceField: 'system.memory.used.pct',
      },
    ],
    hasOperationType: true,
    defaultFilters: [],
    breakdowns: ['host.hostname'],
    filters: [],
    labels: { ...FieldLabels, 'host.hostname': 'Host name' },
    reportDefinitions: [
      {
        field: 'host.hostname',
        required: true,
      },
    ],
  };
}
