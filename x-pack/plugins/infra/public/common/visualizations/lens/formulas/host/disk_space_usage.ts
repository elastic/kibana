/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaValue, LayerValue } from '../../../types';

export const diskSpaceUsage: LayerValue<FormulaValue> = {
  name: 'Disk Space Usage',
  data: {
    value: 'average(system.filesystem.used.pct)',
    format: {
      id: 'percent',
      params: {
        decimals: 0,
      },
    },
  },
};
