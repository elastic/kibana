/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, RECORDS_FIELD, REPORT_METRIC_FIELD } from '../constants';
import { buildExistsFilter } from '../utils';
import { MONITORS_DURATION_LABEL, PINGS_LABEL } from '../constants/labels';

export function getSyntheticsDistributionConfig({
  series,
  indexPattern,
}: ConfigProps): SeriesConfig {
  return {
    reportType: 'data-distribution',
    defaultSeriesType: series?.seriesType || 'line',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: REPORT_METRIC_FIELD,
    },
    yAxisColumns: [
      {
        sourceField: RECORDS_FIELD,
        label: PINGS_LABEL,
      },
    ],
    hasOperationType: false,
    filterFields: ['monitor.type', 'observer.geo.name', 'tags'],
    breakdownFields: [
      'observer.geo.name',
      'monitor.name',
      'monitor.id',
      'monitor.type',
      'tags',
      'url.port',
    ],
    baseFilters: [...buildExistsFilter('summary.up', indexPattern)],
    definitionFields: ['monitor.name', 'url.full'],
    metricOptions: [
      { label: 'Monitor duration', id: 'monitor.duration.us', field: 'monitor.duration.us' },
    ],
    labels: { ...FieldLabels, 'monitor.duration.us': MONITORS_DURATION_LABEL },
  };
}
