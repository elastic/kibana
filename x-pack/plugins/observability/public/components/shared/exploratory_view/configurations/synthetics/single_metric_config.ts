/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_STEP_NAME } from '../constants/field_names/synthetics';
import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, FORMULA_COLUMN } from '../constants';
import { buildExistsFilter } from '../utils';

export function getSyntheticsSingleMetricConfig({ dataView }: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'line',
    xAxisColumn: {},
    yAxisColumns: [
      {
        operationType: 'median',
      },
    ],
    breakdownFields: [],
    filterFields: [],
    seriesTypes: [],
    hasOperationType: true,
    definitionFields: [
      { field: 'monitor.name', nested: SYNTHETICS_STEP_NAME, singleSelection: true },
      { field: 'url.full', filters: buildExistsFilter('summary.up', dataView) },
    ],
    reportType: 'single-metric',
    baseFilters: [...buildExistsFilter('summary.up', dataView)],
    metricOptions: [
      {
        id: 'monitor_availability',
        columnType: FORMULA_COLUMN,
        label: 'Monitor availability',
        formula: "1- (count(kql='summary.down > 0') / count())",
        metricStateOptions: {
          colorMode: 'Labels',
          palette: {
            name: 'custom',
            type: 'palette',
            params: {
              steps: 3,
              name: 'custom',
              reverse: false,
              rangeType: 'number',
              rangeMin: 0.8,
              rangeMax: 1,
              progression: 'fixed',
              stops: [
                { color: '#cc5642', stop: 0.9 },
                { color: '#d6bf57', stop: 0.95 },
                { color: '#209280', stop: 1.9903347477604902 },
              ],
              colorStops: [
                { color: '#cc5642', stop: 0.8 },
                { color: '#d6bf57', stop: 0.9 },
                { color: '#209280', stop: 0.95 },
              ],
              continuity: 'above',
              maxSteps: 5,
            },
          },
        },
      },
    ],
    labels: FieldLabels,
  };
}
