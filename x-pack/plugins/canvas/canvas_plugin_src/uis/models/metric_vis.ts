/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ResolvedColumns } from '../../../public/expression_types/arg';

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
      multi: true,
      default: `{visdimension}`,
    },
    {
      name: 'bucket',
      displayName: strings.getBucketColumnDisplayName(),
      help: strings.getBucketColumnHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
    },
    {
      name: 'palette',
      argType: 'stops_palette',
    },
    {
      name: 'font',
      displayName: strings.getFontColumnDisplayName(),
      help: strings.getFontColumnHelp(),
      argType: 'font',
      default: `{font size=60 align="center"}`,
    },
    {
      name: 'colorMode',
      displayName: strings.getColorModeColumnDisplayName(),
      help: strings.getColorModeColumnHelp(),
      argType: 'select',
      default: 'Labels',
      options: {
        choices: [
          { value: 'None', name: strings.getColorModeNoneOption() },
          { value: 'Labels', name: strings.getColorModeLabelOption() },
          { value: 'Background', name: strings.getColorModeBackgroundOption() },
        ],
      },
    },
    {
      name: 'showLabels',
      displayName: strings.getShowLabelsColumnDisplayName(),
      help: strings.getShowLabelsColumnHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'percentageMode',
      displayName: strings.getPercentageModeColumnDisplayName(),
      help: strings.getPercentageModeColumnHelp(),
      argType: 'toggle',
    },
  ],
  resolve({ context }: any): ResolvedColumns {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
