/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { plotFunctionFactory } from '../../../public/functions/plot';
import { FunctionFactoryHelp } from '../function_help';
import { Legend } from '../../../types';
import { CSS, FONT_FAMILY, FONT_WEIGHT, BOOLEAN_FALSE } from '../../constants';

export const help: FunctionFactoryHelp<typeof plotFunctionFactory> = {
  help: i18n.translate('xpack.canvas.functions.plotHelpText', {
    defaultMessage: 'Configures a chart element.',
  }),
  args: {
    defaultStyle: i18n.translate('xpack.canvas.functions.plot.args.defaultStyleHelpText', {
      defaultMessage: 'The default style to use for every series.',
    }),
    font: i18n.translate('xpack.canvas.functions.plot.args.fontHelpText', {
      defaultMessage:
        'The {CSS} font properties for the labels. For example, {FONT_FAMILY} or {FONT_WEIGHT}.',
      values: {
        CSS,
        FONT_FAMILY,
        FONT_WEIGHT,
      },
    }),
    legend: i18n.translate('xpack.canvas.functions.plot.args.legendHelpText', {
      defaultMessage:
        'The legend position. For example, {legend}, or {BOOLEAN_FALSE}. When {BOOLEAN_FALSE}, the legend is hidden.',
      values: {
        legend: Object.values(Legend)
          .map((position) => `\`"${position}"\``)
          .join(', '),
        BOOLEAN_FALSE,
      },
    }),
    palette: i18n.translate('xpack.canvas.functions.plot.args.paletteHelpText', {
      defaultMessage: 'A {palette} object for describing the colors to use in this chart.',
      values: {
        palette: '`palette`',
      },
    }),
    seriesStyle: i18n.translate('xpack.canvas.functions.plot.args.seriesStyleHelpText', {
      defaultMessage: 'A style of a specific series',
    }),
    xaxis: i18n.translate('xpack.canvas.functions.plot.args.xaxisHelpText', {
      defaultMessage: 'The axis configuration. When {BOOLEAN_FALSE}, the axis is hidden.',
      values: {
        BOOLEAN_FALSE,
      },
    }),
    yaxis: i18n.translate('xpack.canvas.functions.plot.args.yaxisHelpText', {
      defaultMessage: 'The axis configuration. When {BOOLEAN_FALSE}, the axis is hidden.',
      values: {
        BOOLEAN_FALSE,
      },
    }),
  },
};
