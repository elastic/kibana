/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaValue, LayerValue } from '../../../types';

export const diskReadThroughput: LayerValue<FormulaValue> = {
  name: 'Disk Read Throughput',
  data: {
    value: "counter_rate(max(system.diskio.read.count), kql='system.diskio.read.count: *')",
    format: {
      id: 'bytes',
      params: {
        decimals: 1,
      },
    },
  },
};
