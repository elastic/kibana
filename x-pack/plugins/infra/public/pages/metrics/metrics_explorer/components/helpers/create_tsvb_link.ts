/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encode } from 'rison-node';
import uuid from 'uuid';
import { set } from 'lodash';
import { colorTransformer, MetricsExplorerColor } from '../../../../../../common/color_palette';
import { MetricsExplorerSeries } from '../../../../../../common/http_api/metrics_explorer';
import {
  MetricsExplorerOptions,
  MetricsExplorerOptionsMetric,
  MetricsExplorerTimeOptions,
  MetricsExplorerChartOptions,
  MetricsExplorerYAxisMode,
  MetricsExplorerChartType,
} from '../../hooks/use_metrics_explorer_options';
import { metricToFormat } from './metric_to_format';
import { InfraFormatterType } from '../../../../../lib/lib';
import { SourceQuery } from '../../../../../graphql/types';
import { createMetricLabel } from './create_metric_label';
import { LinkDescriptor } from '../../../../../hooks/use_link_props';

export const metricsExplorerMetricToTSVBMetric = (metric: MetricsExplorerOptionsMetric) => {
  if (metric.aggregation === 'rate') {
    const metricId = uuid.v1();
    const positiveOnlyId = uuid.v1();
    const derivativeId = uuid.v1();
    return [
      {
        id: metricId,
        type: 'max',
        field: metric.field || void 0,
      },
      {
        id: derivativeId,
        type: 'derivative',
        field: metricId,
        unit: '1s',
      },
      {
        id: positiveOnlyId,
        type: 'positive_only',
        field: derivativeId,
      },
    ];
  } else if (metric.aggregation === 'p95' || metric.aggregation === 'p99') {
    const percentileValue = metric.aggregation === 'p95' ? '95' : '99';
    return [
      {
        id: uuid.v1(),
        type: 'percentile',
        field: metric.field,
        percentiles: [
          {
            id: uuid.v1(),
            value: percentileValue,
            mode: 'line',
            percentile: '',
            shade: 0.2,
          },
        ],
      },
    ];
  } else {
    return [
      {
        id: uuid.v1(),
        type: metric.aggregation,
        field: metric.field || void 0,
      },
    ];
  }
};

const mapMetricToSeries = (chartOptions: MetricsExplorerChartOptions) => (
  metric: MetricsExplorerOptionsMetric
) => {
  const format = metricToFormat(metric);
  return {
    label: createMetricLabel(metric),
    axis_position: 'right',
    chart_type: 'line',
    color:
      (metric.color && colorTransformer(metric.color)) ||
      colorTransformer(MetricsExplorerColor.color0),
    fill: chartOptions.type === MetricsExplorerChartType.area ? 0.5 : 0,
    formatter: format === InfraFormatterType.bits ? InfraFormatterType.bytes : format,
    value_template: 'rate' === metric.aggregation ? '{{value}}/s' : '{{value}}',
    id: uuid.v1(),
    line_width: 2,
    metrics: metricsExplorerMetricToTSVBMetric(metric),
    point_size: 0,
    separate_axis: 0,
    split_mode: 'everything',
    stacked: chartOptions.stack ? 'stacked' : 'none',
  };
};

export const createFilterFromOptions = (
  options: MetricsExplorerOptions,
  series: MetricsExplorerSeries
) => {
  const filters = [];
  if (options.filterQuery) {
    filters.push(options.filterQuery);
  }
  if (options.groupBy) {
    const id = series.id.replace('"', '\\"');
    const groupByFilters = Array.isArray(options.groupBy)
      ? options.groupBy
          .map((field, index) => {
            if (!series.keys) {
              return null;
            }
            const value = series.keys[index];
            if (!value) {
              return null;
            }
            return `${field}: "${value.replace('"', '\\"')}"`;
          })
          .join(' and ')
      : `${options.groupBy} : "${id}"`;
    filters.push(groupByFilters);
  }
  return { language: 'kuery', query: filters.join(' and ') };
};

export const createTSVBLink = (
  source: SourceQuery.Query['source']['configuration'] | undefined,
  options: MetricsExplorerOptions,
  series: MetricsExplorerSeries,
  timeRange: MetricsExplorerTimeOptions,
  chartOptions: MetricsExplorerChartOptions
): LinkDescriptor => {
  const appState = {
    filters: [],
    linked: false,
    query: { language: 'kuery', query: '' },
    uiState: {},
    vis: {
      aggs: [],
      params: {
        axis_formatter: 'number',
        axis_position: 'left',
        axis_scale: 'normal',
        id: uuid.v1(),
        default_index_pattern: (source && source.metricAlias) || 'metricbeat-*',
        index_pattern: (source && source.metricAlias) || 'metricbeat-*',
        interval: 'auto',
        series: options.metrics.map(mapMetricToSeries(chartOptions)),
        show_grid: 1,
        show_legend: 1,
        time_field: (source && source.fields.timestamp) || '@timestamp',
        type: 'timeseries',
        filter: createFilterFromOptions(options, series),
      },
      title: series.id,
      type: 'metrics',
    },
  };

  if (chartOptions.yAxisMode === MetricsExplorerYAxisMode.fromZero) {
    set(appState, 'vis.params.axis_min', 0);
  }

  const globalState = {
    refreshInterval: { pause: true, value: 0 },
    time: { from: timeRange.from, to: timeRange.to },
  };

  return {
    app: 'visualize',
    hash: '/create',
    search: {
      type: 'metrics',
      _g: encode(globalState),
      _a: encode(appState as any),
    },
  };
};
