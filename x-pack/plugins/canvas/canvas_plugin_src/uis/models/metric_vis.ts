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
  name: 'tagcloud',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'metric',
      displayName: strings.getMetricColumnDisplayName(),
      help: strings.getMetricColumnHelp(),
      argType: 'vis_dimension',
      multi: true,
    },
    {
      name: 'bucket',
      displayName: strings.getBucketColumnDisplayName(),
      help: strings.getBucketColumnHelp(),
      argType: 'vis_dimension',
    },
  ],
  resolve({ context }: any) {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
