/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSeries } from '../../types';
import { FieldLabels } from '../constants';

interface Props {
  seriesId: string;
}

export function getLogsFrequencyLensConfig({ seriesId }: Props): DataSeries {
  return {
    id: seriesId,
    reportType: 'logs-frequency',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        operationType: 'count',
      },
    ],
    hasOperationType: false,
    defaultFilters: [],
    breakdowns: ['agent.hostname'],
    filters: [],
    labels: { ...FieldLabels },
    reportDefinitions: [
      {
        field: 'agent.hostname',
        required: true,
      },
    ],
  };
}
