/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const diskIOWrite: FormulaValueConfig = {
  label: 'Disk Write IOPS',
  value: "counter_rate(max(system.diskio.write.count), kql='system.diskio.write.count: *')",
  format: {
    id: 'number',
    params: {
      decimals: 0,
    },
  },
};
