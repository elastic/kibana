/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels, RECORDS_FIELD } from '../constants';
import { buildExistsFilter } from '../utils';
import { MONITORS_DURATION_LABEL, PINGS_LABEL } from '../constants/labels';

export function getSyntheticsDistributionConfig({ indexPattern }: ConfigProps): DataSeries {
  return {
    reportType: 'data-distribution',
    defaultSeriesType: 'line',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: 'performance.metric',
    },
    yAxisColumns: [
      {
        sourceField: RECORDS_FIELD,
        label: PINGS_LABEL,
      },
    ],
    hasOperationType: false,
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
      {
        field: 'performance.metric',
        custom: true,
        options: [
          { label: 'Monitor duration', id: 'monitor.duration.us', field: 'monitor.duration.us' },
        ],
      },
    ],
    labels: { ...FieldLabels, 'monitor.duration.us': MONITORS_DURATION_LABEL },
  };
}
