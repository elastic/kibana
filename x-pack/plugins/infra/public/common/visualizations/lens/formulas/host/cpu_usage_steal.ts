/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const cpuUsageSteal: FormulaValueConfig = {
  label: 'steal',
  value: 'average(system.cpu.steal.pct) / max(system.cpu.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 0,
    },
  },
};
