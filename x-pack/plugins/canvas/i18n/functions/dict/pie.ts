/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { pieFunctionFactory } from '../../../public/functions/pie';
import { FunctionFactoryHelp } from '../function_help';
import { Legend } from '../../../types';
import { CSS, FONT_FAMILY, FONT_WEIGHT, BOOLEAN_FALSE } from '../../constants';

export const help: FunctionFactoryHelp<typeof pieFunctionFactory> = {
  help: i18n.translate('xpack.canvas.functions.pieHelpText', {
    defaultMessage: 'Configures a pie chart element.',
  }),
  args: {
    font: i18n.translate('xpack.canvas.functions.pie.args.fontHelpText', {
      defaultMessage:
        'The {CSS} font properties for the labels. For example, {FONT_FAMILY} or {FONT_WEIGHT}.',
      values: {
        CSS,
        FONT_FAMILY,
        FONT_WEIGHT,
      },
    }),
    hole: i18n.translate('xpack.canvas.functions.pie.args.holeHelpText', {
      defaultMessage:
        'Draws a hole in the pie, between `0` and `100`, as a percentage of the pie radius.',
    }),
    labelRadius: i18n.translate('xpack.canvas.functions.pie.args.labelRadiusHelpText', {
      defaultMessage:
        'The percentage of the container area to use as a radius for the label circle.',
    }),
    labels: i18n.translate('xpack.canvas.functions.pie.args.labelsHelpText', {
      defaultMessage: 'Display the pie labels?',
    }),
    legend: i18n.translate('xpack.canvas.functions.pie.args.legendHelpText', {
      defaultMessage:
        'The legend position. For example, {legend}, or {BOOLEAN_FALSE}. When {BOOLEAN_FALSE}, the legend is hidden.',
      values: {
        legend: Object.values(Legend)
          .map((position) => `\`"${position}"\``)
          .join(', '),
        BOOLEAN_FALSE,
      },
    }),
    palette: i18n.translate('xpack.canvas.functions.pie.args.paletteHelpText', {
      defaultMessage: 'A {palette} object for describing the colors to use in this pie chart.',
      values: {
        palette: '`palette`',
      },
    }),
    radius: i18n.translate('xpack.canvas.functions.pie.args.radiusHelpText', {
      defaultMessage:
        'The radius of the pie as a percentage, between `0` and `1`, of the available space. ' +
        'To automatically set the radius, use {auto}.',
      values: {
        auto: '`"auto"`',
      },
    }),
    seriesStyle: i18n.translate('xpack.canvas.functions.pie.args.seriesStyleHelpText', {
      defaultMessage: 'A style of a specific series',
    }),
    tilt: i18n.translate('xpack.canvas.functions.pie.args.tiltHelpText', {
      defaultMessage:
        'The percentage of tilt where `1` is fully vertical, and `0` is completely flat.',
    }),
  },
};
