/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';

export const defaultExpression = (): ExpressionAstExpression => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'partitionLabels',
      arguments: {
        show: [true],
        position: ['default'],
        values: [true],
        percentDecimals: [2],
        valuesFormat: ['percent'],
      },
    },
  ],
});
