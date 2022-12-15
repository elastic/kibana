/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LegacyMetricState } from '@kbn/lens-plugin/common';
import { euiPaletteForStatus } from '@elastic/eui';
import {
  SYNTHETICS_STEP_DURATION,
  SYNTHETICS_STEP_NAME,
} from '../constants/field_names/synthetics';
import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, FORMULA_COLUMN, RECORDS_FIELD } from '../constants';
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
    baseFilters: [],
    metricOptions: [
      {
        id: 'monitor_availability',
        columnType: FORMULA_COLUMN,
        label: 'Availability',
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
              rangeMin: 0,
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
          titlePosition: 'bottom',
        },
        columnFilter: { language: 'kuery', query: 'summary.up: *' },
      },
      {
        id: 'monitor_duration',
        field: 'monitor.duration.us',
        label: i18n.translate('xpack.observability.expView.avgDuration', {
          defaultMessage: 'Avg. Duration',
        }),
        metricStateOptions: {
          titlePosition: 'bottom',
        },
        columnFilter: { language: 'kuery', query: 'summary.up: *' },
      },
      {
        id: 'step_duration',
        field: SYNTHETICS_STEP_DURATION,
        label: i18n.translate('xpack.observability.expView.stepDuration', {
          defaultMessage: 'Total step duration',
        }),
        metricStateOptions: {
          titlePosition: 'bottom',
          textAlign: 'center',
        },
      },
      {
        id: 'monitor_total_runs',
        label: i18n.translate('xpack.observability.expView.totalRuns', {
          defaultMessage: 'Total Runs',
        }),
        metricStateOptions: {
          titlePosition: 'bottom',
        },
        columnType: FORMULA_COLUMN,
        formula: 'unique_count(monitor.check_group)',
        format: 'number',
      },
      {
        id: 'monitor_complete',
        label: i18n.translate('xpack.observability.expView.complete', {
          defaultMessage: 'Complete',
        }),
        metricStateOptions: {
          titlePosition: 'bottom',
        },
        columnType: FORMULA_COLUMN,
        formula: 'unique_count(monitor.check_group, kql=\'monitor.status: "up"\')',
        format: 'number',
      },
      {
        id: 'monitor_errors',
        label: i18n.translate('xpack.observability.expView.errors', {
          defaultMessage: 'Errors',
        }),
        metricStateOptions: {
          titlePosition: 'bottom',
          colorMode: 'Labels',
          palette: getColorPalette('danger'),
        },
        columnType: FORMULA_COLUMN,
        formula: 'unique_count(monitor.check_group, kql=\'monitor.status: "down"\')',
        format: 'number',
      },
      {
        id: 'monitor_failed_tests',
        label: i18n.translate('xpack.observability.expView.failedTests', {
          defaultMessage: 'Failed tests',
        }),
        metricStateOptions: {
          titlePosition: 'bottom',
        },
        field: RECORDS_FIELD,
        format: 'number',
        columnFilter: { language: 'kuery', query: 'summary.down > 0' },
      },
    ],
    labels: FieldLabels,
  };
}

const getColorPalette = (color: 'danger' | 'warning' | 'success'): LegacyMetricState['palette'] => {
  const statusPalette = euiPaletteForStatus(5);

  // TODO: add more colors

  return {
    name: 'custom',
    type: 'palette',
    params: {
      steps: 3,
      name: 'custom',
      reverse: false,
      rangeType: 'number',
      rangeMin: 0,
      progression: 'fixed',
      stops: [{ color: statusPalette[3], stop: 100 }],
      colorStops: [{ color: statusPalette[3], stop: 0 }],
      continuity: 'above',
      maxSteps: 5,
    },
  };
};
