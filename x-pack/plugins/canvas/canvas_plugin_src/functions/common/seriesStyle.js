/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const name = 'seriesStyle';

export const seriesStyle = () => ({
  name,
  help: i18n.translate('xpack.canvas.functions.seriesStyleHelpText', {
    defaultMessage:
      'Creates an object used for describing the properties of a series on a chart. You would usually use this inside of a charting function',
  }),
  context: {
    types: ['null'],
  },
  args: {
    label: {
      types: ['string'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.argsLabelDisplayName', {
        defaultMessage: 'Series label',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.argsLabelHelpText', {
        defaultMessage:
          'The label of the line this style applies to, not the name you would like to give the line',
      }),
    },
    color: {
      types: ['string', 'null'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.argsColorDisplayName', {
        defaultMessage: 'Color',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.argsColorHelpText', {
        defaultMessage: 'Color to assign the line',
      }),
    },
    lines: {
      types: ['number'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.argsLinesDisplayName', {
        defaultMessage: 'Line width',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.argsLinesHelpText', {
        defaultMessage: 'Width of the line',
      }),
    },
    bars: {
      types: ['number'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.argsBarsDisplayName', {
        defaultMessage: 'Bar width',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.argsBarsHelpText', {
        defaultMessage: 'Width of bars',
      }),
    },
    points: {
      types: ['number'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.argsPointsDisplayName', {
        defaultMessage: 'Show points',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.argsPointsHelpText', {
        defaultMessage: 'Size of points on line',
      }),
    },
    fill: {
      types: ['number', 'boolean'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.argsFillDisplayName', {
        defaultMessage: 'Fill points',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.argsFillHelpText', {
        defaultMessage: 'Should we fill points?',
      }),
    },
    stack: {
      types: ['number', 'null'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.argsStackDisplayName', {
        defaultMessage: 'Stack series',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.argsStackHelpText', {
        defaultMessage:
          'Should we stack the series? This is the stack "id". Series with the same stack id will be stacked together',
      }),
    },
    horizontalBars: {
      types: ['boolean'],
      displayName: i18n.translate(
        'xpack.canvas.functions.seriesStyle.argsHorizontalBarsOrientationDisplayName',
        {
          defaultMessage: 'Horizontal bars orientation',
        }
      ),
      help: i18n.translate(
        'xpack.canvas.functions.seriesStyle.argsHorizontalBarsOrientationHelpText',
        {
          defaultMessage: 'Sets the orientation of bars in the chart to horizontal',
        }
      ),
    },
  },
  fn: (context, args) => ({ type: name, ...args }),
});
