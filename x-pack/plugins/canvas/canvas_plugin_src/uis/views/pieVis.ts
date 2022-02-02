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

const { PieVis: strings } = ViewStrings;

export const pieVis = () => ({
  name: 'pieVis',
  displayName: strings.getDisplayName(),
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
    },
  ],
  resolve({ context }: any): ResolvedColumns {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
