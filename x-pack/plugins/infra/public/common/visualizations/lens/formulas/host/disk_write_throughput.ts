/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils';

export const diskWriteThroughput: FormulaValueConfig = {
  label: 'Disk Write Throughput',
  value: "counter_rate(max(system.diskio.write.bytes), kql='system.diskio.write.bytes: *')",
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
};
