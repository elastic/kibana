/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { ModelStrings } from '../../../i18n';

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
      options: {
        onlyMath: false,
      },
    },
  ],
  resolve({ context }: any) {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
