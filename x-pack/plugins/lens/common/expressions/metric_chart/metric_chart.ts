/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import type { LensMultiTable } from '../../types';
import type { MetricConfig } from './types';

interface MetricRender {
  type: 'render';
  as: 'lens_metric_chart_renderer';
  value: MetricChartProps;
}

export interface MetricChartProps {
  data: LensMultiTable;
  args: MetricConfig;
}

export const metricChart: ExpressionFunctionDefinition<
  'lens_metric_chart',
  LensMultiTable,
  Omit<MetricConfig, 'layerId' | 'layerType'>,
  MetricRender
> = {
  name: 'lens_metric_chart',
  type: 'render',
  help: 'A metric chart',
  args: {
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    description: {
      types: ['string'],
      help: '',
    },
    metricTitle: {
      types: ['string'],
      help: 'The title of the metric shown.',
    },
    accessor: {
      types: ['string'],
      help: 'The column whose value is being displayed',
    },
    mode: {
      types: ['string'],
      options: ['reduced', 'full'],
      default: 'full',
      help: 'The display mode of the chart - reduced will only show the metric itself without min size',
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data, args) {
    return {
      type: 'render',
      as: 'lens_metric_chart_renderer',
      value: {
        data,
        args,
      },
    } as MetricRender;
  },
};
