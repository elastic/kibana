/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, uniqBy } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { legendOptions } from '../../../public/lib/legend_options';
import { ViewStrings } from '../../../i18n';

const { Plot: strings } = ViewStrings;
const styleProps = ['lines', 'bars', 'points', 'fill', 'stack'];

export const plot = () => ({
  name: 'plot',
  displayName: strings.getDisplayName(),
  modelArgs: ['x', 'y', 'color', 'size', 'text'],
  args: [
    {
      name: 'palette',
      argType: 'palette',
    },
    {
      name: 'legend',
      displayName: strings.getLegendDisplayName(),
      help: strings.getLegendHelp(),
      argType: 'select',
      default: 'ne',
      options: {
        choices: legendOptions,
      },
    },
    {
      name: 'xaxis',
      displayName: strings.getXaxisDisplayName(),
      help: strings.getXaxisHelp(),
      argType: 'axisConfig',
      default: true,
    },
    {
      name: 'yaxis',
      displayName: strings.getYaxisDisplayName(),
      help: strings.getYaxisHelp(),
      argType: 'axisConfig',
      default: true,
    },
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'defaultStyle',
      displayName: strings.getDefaultStyleDisplayName(),
      help: strings.getDefaultStyleHelp(),
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
    if (getState(context) !== 'ready') {
      return { labels: [] };
    }
    return { labels: uniqBy(map(getValue(context).rows, 'color').filter((v) => v !== undefined)) };
  },
});
