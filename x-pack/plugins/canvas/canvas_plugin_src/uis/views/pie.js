/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, uniq } from 'lodash';
import { legendOptions } from '../../../public/lib/legend_options';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const pie = () => ({
  name: 'pie',
  displayName: 'Chart style',
  modelArgs: [['color', { label: 'Slice Labels' }], ['size', { label: 'Slice Angles' }]],
  args: [
    {
      name: 'palette',
      argType: 'palette',
    },
    {
      name: 'hole',
      displayName: 'Inner radius',
      help: 'Radius of the hole',
      argType: 'range',
      default: 50,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'labels',
      displayName: 'Labels',
      help: 'Show/hide labels',
      argType: 'toggle',
      default: true,
    },
    {
      name: 'labelRadius',
      displayName: 'Label radius',
      help: 'Distance of the labels from the center of the pie',
      argType: 'range',
      default: 100,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'legend',
      displayName: 'Legend position',
      help: 'Disable or position the legend',
      argType: 'select',
      default: 'ne',
      options: {
        choices: legendOptions,
      },
    },
    {
      name: 'radius',
      displayName: 'Radius',
      help: 'Radius of the pie',
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
      displayName: 'Tilt angle',
      help: 'Percentage of tilt where 1 is fully vertical and 0 is completely flat',
      argType: 'percentage',
      default: 1,
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
