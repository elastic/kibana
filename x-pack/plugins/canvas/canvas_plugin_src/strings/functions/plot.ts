/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { plot } from '../../functions/common/plot';
import { FunctionHelp } from '.';
import { FunctionFactory, Position } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof plot>> = {
  help: i18n.translate('xpack.canvas.functions.plotHelpText', {
    defaultMessage: 'Configure a {plot} element',
    values: {
      plot: 'plot',
    },
  }),
  args: {
    seriesStyle: i18n.translate('xpack.canvas.functions.plot.args.seriesStyleHelpText', {
      defaultMessage: 'A style of a specific series',
    }),
    defaultStyle: i18n.translate('xpack.canvas.functions.plot.args.defaultStyleHelpText', {
      defaultMessage: 'The default style to use for every series',
    }),
    palette: i18n.translate('xpack.canvas.functions.plot.args.paletteHelpText', {
      defaultMessage: 'A {palette} object for describing the colors to use on this plot',
      values: {
        palette: 'palette',
      },
    }),
    font: i18n.translate('xpack.canvas.functions.plot.args.fontHelpText', {
      defaultMessage: 'Legend and tick mark fonts',
    }),
    legend: i18n.translate('xpack.canvas.functions.plot.args.legendHelpText', {
      defaultMessage: 'Legend position: {position} or {false}',
      values: {
        position: Object.values(Position).join(', '),
        false: 'false',
      },
    }),
    yaxis: i18n.translate('xpack.canvas.functions.plot.args.yaxisHelpText', {
      defaultMessage: 'Axis configuration, or {false} to disable',
      values: {
        false: 'false',
      },
    }),
    xaxis: i18n.translate('xpack.canvas.functions.plot.args.xaxisHelpText', {
      defaultMessage: 'Axis configuration, or {false} to disable',
      values: {
        false: 'false',
      },
    }),
  },
};
