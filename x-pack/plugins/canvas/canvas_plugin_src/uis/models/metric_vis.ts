/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { ViewStrings } from '../../../i18n';
import { getState, getValue } from '../../../public/lib/resolved_arg';

const { MetricVis: strings } = ViewStrings;

export const metricVis = () => ({
  name: 'metricVis',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'metric',
      displayName: strings.getMetricColumnDisplayName(),
      help: strings.getMetricColumnHelp(),
      argType: 'vis_dimension',
      default: '{vis_dimension ""}',
      multi: true,
    },
    {
      name: 'bucket',
      displayName: strings.getBucketColumnDisplayName(),
      help: strings.getBucketColumnHelp(),
      argType: 'vis_dimension',
      default: '{vis_dimension ""}',
    },
    {
      name: 'font',
      displayName: strings.getFontColumnDisplayName(),
      help: strings.getFontColumnHelp(),
      argType: 'font',
      default: '{font size=60}',
    },
    {
      name: 'percentageMode',
      displayName: strings.getPercentageModeColumnDisplayName(),
      help: strings.getPercentageModeColumnHelp(),
      argType: 'toggle',
      default: false,
    },
    {
      name: 'showLabels',
      displayName: strings.getShowLabelsColumnDisplayName(),
      help: strings.getShowLabelsColumnHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'bgFill',
      displayName: strings.getBgFillColumnDisplayName(),
      help: strings.getBgFillColumnHelp(),
      argType: 'color',
      default: '"#000"',
    },
    {
      name: 'colorRange',
      displayName: strings.getColorRangeColumnDisplayName(),
      help: strings.getColorRangeColumnHelp(),
      argType: 'range',
      default: '{range from=0 to=10000}',
      multi: true,
    },
  ],
  resolve({ context }: any) {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
