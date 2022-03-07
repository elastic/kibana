/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ColorMode } from '../../../../../../src/plugins/charts/common';
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
      help: i18n.translate('xpack.lens.metric.title.help', {
        defaultMessage: 'The visualization title.',
      }),
    },
    size: {
      types: ['string'],
      help: i18n.translate('xpack.lens.metric.size.help', {
        defaultMessage: 'The visualization text size.',
      }),
      default: 'xl',
    },
    titlePosition: {
      types: ['string'],
      help: i18n.translate('xpack.lens.metric.titlePosition.help', {
        defaultMessage: 'The visualization title position.',
      }),
      default: 'bottom',
    },
    textAlign: {
      types: ['string'],
      help: i18n.translate('xpack.lens.metric.textAlignPosition.help', {
        defaultMessage: 'The visualization text alignment position.',
      }),
      default: 'center',
    },
    description: {
      types: ['string'],
      help: '',
    },
    metricTitle: {
      types: ['string'],
      help: i18n.translate('xpack.lens.metric.metricTitle.help', {
        defaultMessage: 'The title of the metric shown.',
      }),
    },
    accessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.metric.accessor.help', {
        defaultMessage: 'The column whose value is being displayed',
      }),
    },
    mode: {
      types: ['string'],
      options: ['reduced', 'full'],
      default: 'full',
      help: i18n.translate('xpack.lens.metric.mode.help', {
        defaultMessage:
          'The display mode of the chart - reduced will only show the metric itself without min size',
      }),
    },
    colorMode: {
      types: ['string'],
      default: `"${ColorMode.None}"`,
      options: [ColorMode.None, ColorMode.Labels, ColorMode.Background],
      help: i18n.translate('xpack.lens.metric.colorMode.help', {
        defaultMessage: 'Which part of metric to color',
      }),
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('xpack.lens.metric.palette.help', {
        defaultMessage: 'Provides colors for the values',
      }),
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
