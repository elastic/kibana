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

export function getNetworkActivityLensConfig({ seriesId }: Props): DataSeries {
  return {
    id: seriesId,
    reportType: 'network-activity',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumn: {
      operationType: 'avg' as OperationType,
      sourceField: 'system.memory.used.pct',
    },
    hasMetricType: true,
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
