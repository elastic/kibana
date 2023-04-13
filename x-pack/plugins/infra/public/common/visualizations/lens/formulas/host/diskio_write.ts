/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensChartConfig } from '../../../types';

export const diskIOWrite: LensChartConfig = {
  title: 'Disk Write IOPS',
  formula: {
    formula: "counter_rate(max(system.diskio.write.bytes), kql='system.diskio.write.bytes>= 0')",
    format: {
      id: 'bytes',
      params: {
        decimals: 1,
      },
    },
  },
};
