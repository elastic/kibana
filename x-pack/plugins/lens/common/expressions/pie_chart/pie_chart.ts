/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';

import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import type { LensMultiTable } from '../../types';
import type { PieExpressionProps, PieExpressionArgs } from './types';

interface PieRender {
  type: 'render';
  as: 'lens_pie_renderer';
  value: PieExpressionProps;
}

export const pie: ExpressionFunctionDefinition<
  'lens_pie',
  LensMultiTable,
  PieExpressionArgs,
  PieRender
> = {
  name: 'lens_pie',
  type: 'render',
  help: i18n.translate('xpack.lens.pie.expressionHelpLabel', {
    defaultMessage: 'Pie renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    description: {
      types: ['string'],
      help: '',
    },
    groups: {
      types: ['string'],
      multi: true,
      help: '',
    },
    metric: {
      types: ['string'],
      help: '',
    },
    shape: {
      types: ['string'],
      options: ['pie', 'donut', 'treemap'],
      help: '',
    },
    hideLabels: {
      types: ['boolean'],
      help: '',
    },
    numberDisplay: {
      types: ['string'],
      options: ['hidden', 'percent', 'value'],
      help: '',
    },
    categoryDisplay: {
      types: ['string'],
      options: ['default', 'inside', 'hide'],
      help: '',
    },
    legendDisplay: {
      types: ['string'],
      options: ['default', 'show', 'hide'],
      help: '',
    },
    nestedLegend: {
      types: ['boolean'],
      help: '',
    },
    legendMaxLines: {
      types: ['number'],
      help: '',
    },
    truncateLegend: {
      types: ['boolean'],
      help: '',
    },
    legendPosition: {
      types: ['string'],
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: '',
    },
    percentDecimals: {
      types: ['number'],
      help: '',
    },
    palette: {
      default: `{theme "palette" default={system_palette name="default"} }`,
      help: '',
      types: ['palette'],
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: PieExpressionArgs) {
    return {
      type: 'render',
      as: 'lens_pie_renderer',
      value: {
        data,
        args,
      },
    };
  },
};
