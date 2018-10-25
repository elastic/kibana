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
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.args.labelDisplayName', {
        defaultMessage: 'Series label',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.args.labelHelpText', {
        defaultMessage:
          'The label of the line this style applies to, not the name you would like to give the line',
      }),
    },
    color: {
      types: ['string', 'null'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.args.colorDisplayName', {
        defaultMessage: 'Color',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.args.colorHelpText', {
        defaultMessage: 'Color to assign the line',
      }),
    },
    lines: {
      types: ['number'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.args.linesDisplayName', {
        defaultMessage: 'Line width',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.args.linesHelpText', {
        defaultMessage: 'Width of the line',
      }),
    },
    bars: {
      types: ['number'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.args.barsDisplayName', {
        defaultMessage: 'Bar width',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.args.barsHelpText', {
        defaultMessage: 'Width of bars',
      }),
    },
    points: {
      types: ['number'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.args.pointsDisplayName', {
        defaultMessage: 'Show points',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.args.pointsHelpText', {
        defaultMessage: 'Size of points on line',
      }),
    },
    fill: {
      types: ['number', 'boolean'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.args.fillDisplayName', {
        defaultMessage: 'Fill points',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.args.fillHelpText', {
        defaultMessage: 'Should we fill points?',
      }),
      default: false,
      options: [true, false],
    },
    stack: {
      types: ['number', 'null'],
      displayName: i18n.translate('xpack.canvas.functions.seriesStyle.args.stackDisplayName', {
        defaultMessage: 'Stack series',
      }),
      help: i18n.translate('xpack.canvas.functions.seriesStyle.args.stackHelpText', {
        defaultMessage:
          'Should we stack the series? This is the stack "id". Series with the same stack id will be stacked together',
      }),
    },
    horizontalBars: {
      types: ['boolean'],
      displayName: i18n.translate(
        'xpack.canvas.functions.seriesStyle.args.horizontalBarsOrientationDisplayName',
        {
          defaultMessage: 'Horizontal bars orientation',
        }
      ),
      help: i18n.translate(
        'xpack.canvas.functions.seriesStyle.args.horizontalBarsOrientationHelpText',
        {
          defaultMessage: 'Sets the orientation of bars in the chart to horizontal',
        }
      ),
      options: [true, false],
    },
  },
  fn: (context, args) => ({ type: name, ...args }),
});
