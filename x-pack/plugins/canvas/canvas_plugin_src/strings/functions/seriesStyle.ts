/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { seriesStyle } from '../../functions/common/seriesStyle';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof seriesStyle>> = {
  help: i18n.translate('xpack.canvas.functions.seriesStyleHelpText', {
    defaultMessage:
      'Creates an object used for describing the properties of a series on a chart. ' +
      'You would usually use this inside of a charting function',
  }),
  args: {
    label: i18n.translate('xpack.canvas.functions.seriesStyle.args.labelHelpText', {
      defaultMessage:
        'The label of the line this style applies to, not the name you would like to ' +
        'give the line',
    }),
    color: i18n.translate('xpack.canvas.functions.seriesStyle.args.colorHelpText', {
      defaultMessage: 'Color to assign the line',
    }),
    lines: i18n.translate('xpack.canvas.functions.seriesStyle.args.linesHelpText', {
      defaultMessage: 'Width of the line',
    }),
    bars: i18n.translate('xpack.canvas.functions.seriesStyle.args.barsHelpText', {
      defaultMessage: 'Width of bars',
    }),
    points: i18n.translate('xpack.canvas.functions.seriesStyle.args.pointsHelpText', {
      defaultMessage: 'Size of points on line',
    }),
    fill: i18n.translate('xpack.canvas.functions.seriesStyle.args.fillHelpText', {
      defaultMessage: 'Should we fill points?',
    }),
    stack: i18n.translate('xpack.canvas.functions.seriesStyle.args.stackHelpText', {
      defaultMessage:
        'Should we stack the series? This is the stack "id". Series with the same ' +
        'stack id will be stacked together',
    }),
    horizontalBars: i18n.translate(
      'xpack.canvas.functions.seriesStyle.args.horizontalBarsHelpText',
      {
        defaultMessage: 'Sets the orientation of bars in the chart to horizontal',
      }
    ),
  },
};
