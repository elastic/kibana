/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const nodeMemoryUsed: FormulaValueConfig = {
  label: 'Used',
  value: 'average(kubernetes.node.memory.usage.bytes)',
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
};
