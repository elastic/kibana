/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { map, uniq } from 'lodash';
import { legendOptions } from '../../../public/lib/legend_options';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const pie = () => ({
  name: 'pie',
  displayName: i18n.translate('xpack.canvas.uis.views.pieDisplayName', {
    defaultMessage: 'Chart style',
  }),
  modelArgs: [
    [
      'color',
      {
        label: i18n.translate('xpack.canvas.uis.views.pie.modelArgs.sliceLabelsLabel', {
          defaultMessage: 'Slice Labels',
        }),
      },
    ],
    [
      'size',
      {
        label: i18n.translate('xpack.canvas.uis.views.pie.modelArgs.sliceAnglesLabel', {
          defaultMessage: 'Slice Angles',
        }),
      },
    ],
  ],
  args: [
    {
      name: 'palette',
      argType: 'palette',
    },
    {
      name: 'hole',
      displayName: i18n.translate('xpack.canvas.uis.views.pie.args.holeDisplayName', {
        defaultMessage: 'Inner radius',
      }),
      help: i18n.translate('xpack.canvas.uis.views.pie.args.holeHelpText', {
        defaultMessage: 'Radius of the hole',
      }),
      argType: 'range',
      default: 50,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'labels',
      displayName: i18n.translate('xpack.canvas.uis.views.pie.args.labelsDisplayName', {
        defaultMessage: 'Labels',
      }),
      help: i18n.translate('xpack.canvas.uis.views.pie.args.labelsHelpText', {
        defaultMessage: 'Show/hide labels',
      }),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'labelRadius',
      displayName: i18n.translate('xpack.canvas.uis.views.pie.args.labelRadiusDisplayName', {
        defaultMessage: 'Label radius',
      }),
      help: i18n.translate('xpack.canvas.uis.views.pie.args.labelRadiusHelpText', {
        defaultMessage: 'Distance of the labels from the center of the pie',
      }),
      argType: 'range',
      default: 100,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'legend',
      displayName: i18n.translate('xpack.canvas.uis.views.pie.args.legendDisplayName', {
        defaultMessage: 'Legend position',
      }),
      help: i18n.translate('xpack.canvas.uis.views.pie.args.legendHelpText', {
        defaultMessage: 'Disable or position the legend',
      }),
      argType: 'select',
      default: 'ne',
      options: {
        choices: legendOptions,
      },
    },
    {
      name: 'radius',
      displayName: i18n.translate('xpack.canvas.uis.views.pie.args.radiusDisplayName', {
        defaultMessage: 'Radius',
      }),
      help: i18n.translate('xpack.canvas.uis.views.pie.args.radiusHelpText', {
        defaultMessage: 'Radius of the pie',
      }),
      argType: 'percentage',
      default: 1,
    },
    {
      name: 'seriesStyle',
      argType: 'seriesStyle',
      multi: true,
    },
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'tilt',
      displayName: i18n.translate('xpack.canvas.uis.views.pie.args.tiltDisplayName', {
        defaultMessage: 'Tilt angle',
      }),
      help: i18n.translate('xpack.canvas.uis.views.pie.args.tiltHelpText', {
        defaultMessage: 'Percentage of tilt where 1 is fully vertical and 0 is completely flat',
      }),
      argType: 'percentage',
      default: 1,
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
