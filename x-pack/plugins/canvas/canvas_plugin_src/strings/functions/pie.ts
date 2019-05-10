/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { pie } from '../../functions/common/pie';
import { FunctionHelp } from '.';
import { FunctionFactory, Position } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof pie>> = {
  help: i18n.translate('xpack.canvas.functions.pieHelpText', {
    defaultMessage: 'Configure a pie chart element',
  }),
  args: {
    palette: i18n.translate('xpack.canvas.functions.pie.args.paletteHelpText', {
      defaultMessage: 'A {palette} object for describing the colors to use on this pie',
      values: {
        palette: 'palette',
      },
    }),
    seriesStyle: i18n.translate('xpack.canvas.functions.pie.args.seriesStyleHelpText', {
      defaultMessage: 'A style of a specific series',
    }),
    radius: i18n.translate('xpack.canvas.functions.pie.args.radiusHelpText', {
      defaultMessage:
        'Radius of the pie as a percentage (between 0 and 1) of the available ' +
        'space. Set to `{auto}` to automatically set radius',
      values: {
        auto: 'auto',
      },
    }),
    hole: i18n.translate('xpack.canvas.functions.pie.args.holeHelpText', {
      defaultMessage: 'Draw a hole in the pie, 0-100, as a percentage of the pie radius',
    }),
    labels: i18n.translate('xpack.canvas.functions.pie.args.labelsHelpText', {
      defaultMessage: 'Show pie labels?',
    }),
    labelRadius: i18n.translate('xpack.canvas.functions.pie.args.labelRadiusHelpText', {
      defaultMessage: 'Percentage of area of container to use as radius for the label circle',
    }),
    font: i18n.translate('xpack.canvas.functions.pie.args.fontHelpText', {
      defaultMessage: 'Label font',
    }),
    legend: i18n.translate('xpack.canvas.functions.pie.args.legendHelpText', {
      defaultMessage: 'Legend position: {position} or {false}',
      values: {
        position: Object.values(Position).join(', '),
        false: 'false',
      },
    }),
    tilt: i18n.translate('xpack.canvas.functions.pie.args.tiltHelpText', {
      defaultMessage: 'Percentage of tilt where 1 is fully vertical and 0 is completely flat',
    }),
  },
};
