/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { fromExpression } from '../../../common/lib/ast';

export const metric = () => ({
  name: 'metric',
  displayName: 'Metric',
  modelArgs: [['_', { label: 'Number' }]],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: 'Label',
      help: 'Describes the metric',
      argType: 'string',
      default: '',
    },
    {
      name: 'metricFont',
      displayName: 'Metric Text Settings',
      help: 'Fonts, alignment and color',
      argType: 'font',
      default: fromExpression(
        `{font size=48 family="${openSans.value}" color="#000000" align=center lHeight=48}`,
        'argument'
      ),
    },
    {
      name: 'labelFont',
      displayName: 'Label Text Settings',
      help: 'Fonts, alignment and color',
      argType: 'font',
      default: fromExpression(
        `{font size=18 family="${openSans.value}" color="#000000" align=center}`,
        'argument'
      ),
    },
  ],
});
