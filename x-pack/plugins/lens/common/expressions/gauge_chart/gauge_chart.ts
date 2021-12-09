/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import type { LensMultiTable } from '../../types';
import { GaugeArguments, EXPRESSION_GAUGE_NAME, GAUGE_FUNCTION_RENDERER_NAME } from './types';

export interface GaugeExpressionProps {
  data: LensMultiTable;
  args: GaugeArguments;
}
export interface GaugeRender {
  type: 'render';
  as: typeof GAUGE_FUNCTION_RENDERER_NAME;
  value: GaugeExpressionProps;
}

export const gauge: ExpressionFunctionDefinition<
  typeof EXPRESSION_GAUGE_NAME,
  LensMultiTable,
  GaugeArguments,
  GaugeRender
> = {
  name: EXPRESSION_GAUGE_NAME,
  type: 'render',
  help: i18n.translate('xpack.lens.gauge.expressionHelpLabel', {
    defaultMessage: 'Gauge renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.title.help', {
        defaultMessage: 'Saved gauge title',
      }),
    },
    shape: {
      types: ['string'],
      options: ['horizontalBullet', 'verticalBullet'],
      help: i18n.translate('xpack.lens.gauge.shape.help', {
        defaultMessage: 'Type of gauge chart',
      }),
    },
    description: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.description.help', {
        defaultMessage: 'Saved gauge description',
      }),
    },
    metricAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.metricAccessor.help', {
        defaultMessage: 'Current value',
      }),
    },
    minAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.minAccessor.help', {
        defaultMessage: 'Minimum value',
      }),
    },
    maxAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.maxAccessor.help', {
        defaultMessage: 'Maximum value',
      }),
    },
    goalAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gauge.goalAccessor.help', {
        defaultMessage: 'Goal Value',
      }),
    },
    colorMode: {
      types: ['string'],
      default: 'none',
      options: ['none', 'palette'],
      help: i18n.translate('xpack.lens.gauge.colorMode.help', {
        defaultMessage: 'Which part of gauge to color',
      }),
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('xpack.lens.metric.palette.help', {
        defaultMessage: 'Provides colors for the values',
      }),
    },
    ticksPosition: {
      types: ['string'],
      options: ['auto', 'bands'],
      help: i18n.translate('xpack.lens.gaugeChart.config.ticksPosition.help', {
        defaultMessage: 'Specifies the placement of ticks',
      }),
      required: true,
    },
    labelMajor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gaugeChart.config.labelMajor.help', {
        defaultMessage: 'Specifies the labelMajor of the gauge chart displayed inside the chart.',
      }),
      required: false,
    },
    labelMajorMode: {
      types: ['string'],
      options: ['none', 'auto', 'custom'],
      help: i18n.translate('xpack.lens.gaugeChart.config.labelMajorMode.help', {
        defaultMessage: 'Specifies the mode of labelMajor',
      }),
      required: true,
    },
    labelMinor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gaugeChart.config.labelMinor.help', {
        defaultMessage: 'Specifies the labelMinor of the gauge chart',
      }),
      required: false,
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: GaugeArguments) {
    return {
      type: 'render',
      as: GAUGE_FUNCTION_RENDERER_NAME,
      value: {
        data,
        args,
      },
    };
  },
};
