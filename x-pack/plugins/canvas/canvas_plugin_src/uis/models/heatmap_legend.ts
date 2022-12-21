/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { ModelStrings } from '../../../i18n';
import { ResolvedColumns } from '../../../public/expression_types/arg';

const { HeatmapLegend: strings } = ModelStrings;

export const heatmapLegend = () => ({
  name: 'heatmap_legend',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'isVisible',
      displayName: strings.getIsVisibleDisplayName(),
      help: strings.getIsVisibleHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'position',
      displayName: strings.getPositionDisplayName(),
      help: strings.getPositionHelp(),
      argType: 'select',
      default: 'right',
      options: {
        choices: [
          { value: 'top', name: strings.getPositionTopOption() },
          { value: 'right', name: strings.getPositionRightOption() },
          { value: 'bottom', name: strings.getPositionBottomOption() },
          { value: 'left', name: strings.getPositionLeftOption() },
        ],
      },
    },
    {
      name: 'maxLines',
      displayName: strings.getMaxLinesDisplayName(),
      help: strings.getMaxLinesHelp(),
      argType: 'number',
      default: 10,
    },
    {
      name: 'shouldTruncate',
      displayName: strings.getShouldTruncateDisplayName(),
      help: strings.getShouldTruncateHelp(),
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
