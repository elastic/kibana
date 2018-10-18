/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { map, uniq } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { legendOptions } from '../../../public/lib/legend_options';

const styleProps = ['lines', 'bars', 'points', 'fill', 'stack'];

export const plot = () => ({
  name: 'plot',
  displayName: i18n.translate('xpack.canvas.uis.views.plotDisplayName', {
    defaultMessage: 'Chart style',
  }),
  modelArgs: ['x', 'y', 'color', 'size', 'text'],
  args: [
    {
      name: 'palette',
      argType: 'palette',
    },
    {
      name: 'legend',
      displayName: i18n.translate('xpack.canvas.uis.views.plot.args.legendDisplayName', {
        defaultMessage: 'Legend position',
      }),
      help: i18n.translate('xpack.canvas.uis.views.plot.args.legendHelpText', {
        defaultMessage: 'Disable or position the legend',
      }),
      argType: 'select',
      default: 'ne',
      options: {
        choices: legendOptions,
      },
    },
    {
      name: 'xaxis',
      displayName: i18n.translate('xpack.canvas.uis.views.plot.args.xAxisDisplayName', {
        defaultMessage: 'X-axis',
      }),
      help: i18n.translate('xpack.canvas.uis.views.plot.args.xAxisHelpText', {
        defaultMessage: 'Configure or disable the x-axis',
      }),
      argType: 'axisConfig',
      default: true,
    },
    {
      name: 'yaxis',
      displayName: i18n.translate('xpack.canvas.uis.views.plot.args.yAxisDisplayName', {
        defaultMessage: 'Y-axis',
      }),
      help: i18n.translate('xpack.canvas.uis.views.plot.args.yAxisHelpText', {
        defaultMessage: 'Configure or disable the Y-axis',
      }),
      argType: 'axisConfig',
      default: true,
    },
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'defaultStyle',
      displayName: i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyleDisplayName', {
        defaultMessage: 'Default style',
      }),
      help: i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyleHelpText', {
        defaultMessage: 'Set the style to be used by default by every series, unless overridden',
      }),
      argType: 'seriesStyle',
      default: '{seriesStyle points=5}',
      options: {
        include: styleProps,
      },
    },
    {
      name: 'seriesStyle',
      argType: 'seriesStyle',
      options: {
        include: styleProps,
      },
      multi: true,
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
