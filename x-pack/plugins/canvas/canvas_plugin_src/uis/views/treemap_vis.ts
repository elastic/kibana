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

const { TreemapVis: treemapVisStrings, PartitionVis: strings } = ViewStrings;

export const treemapVis = () => ({
  name: 'treemapVis',
  displayName: treemapVisStrings.getDisplayName(),
  args: [
    {
      name: 'metric',
      displayName: strings.getMetricColumnDisplayName(),
      help: strings.getMetricColumnHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
    },
    {
      name: 'buckets',
      displayName: strings.getBucketColumnDisplayName(),
      help: strings.getBucketColumnHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
      multi: true,
    },
    {
      name: 'splitColumn',
      displayName: strings.getSplitColumnDisplayName(),
      help: strings.getSplitColumnHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
    },
    {
      name: 'splitRow',
      displayName: strings.getSplitRowDisplayName(),
      help: strings.getSplitRowHelp(),
      argType: 'vis_dimension',
      default: `{visdimension}`,
    },
    {
      name: 'addTooltip',
      displayName: strings.getAddTooltipDisplayName(),
      help: strings.getAddTooltipHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'legendDisplay',
      displayName: strings.getLegendDisplayName(),
      help: strings.getLegendDisplayHelp(),
      argType: 'select',
      default: 'default',
      options: {
        choices: [
          { value: 'default', name: strings.getLegendDisplayDefaultOption() },
          { value: 'show', name: strings.getLegendDisplayShowOption() },
          { value: 'hide', name: strings.getLegendDisplayHideOption() },
        ],
      },
    },
    {
      name: 'legendPosition',
      displayName: strings.getLegendPositionDisplayName(),
      help: strings.getLegendPositionHelp(),
      argType: 'select',
      default: 'right',
      options: {
        choices: [
          { value: 'top', name: strings.getLegendPositionTopOption() },
          { value: 'right', name: strings.getLegendPositionRightOption() },
          { value: 'bottom', name: strings.getLegendPositionBottomOption() },
          { value: 'left', name: strings.getLegendPositionRightOption() },
        ],
      },
    },
    {
      name: 'nestedLegend',
      displayName: strings.getNestedLegendDisplayName(),
      help: strings.getNestedLegendHelp(),
      argType: 'toggle',
      default: false,
    },
    {
      name: 'truncateLegend',
      displayName: strings.getTruncateLegendDisplayName(),
      help: strings.getTruncateLegendHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'maxLegendLines',
      displayName: strings.getMaxLegendLinesDisplayName(),
      help: strings.getMaxLegendLinesHelp(),
      argType: 'number',
      default: 1,
    },
    {
      name: 'palette',
      argType: 'palette',
    },
    {
      name: 'labels',
      displayName: strings.getLabelsDisplayName(),
      help: strings.getLabelsHelp(),
      type: 'model',
      argType: 'partitionLabels',
    },
  ],
  resolve({ context }: any): ResolvedColumns {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
