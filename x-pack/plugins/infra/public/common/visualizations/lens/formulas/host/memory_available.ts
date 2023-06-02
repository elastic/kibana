/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensChartConfig } from '../../../types';
import { getFilters } from './utils';

export const memoryAvailable: LensChartConfig = {
  title: 'Memory Available',
  formula: {
    formula: 'max(system.memory.total) - average(system.memory.actual.used.bytes)',
    format: {
      id: 'bytes',
      params: {
        decimals: 1,
      },
    },
  },
  getFilters,
};
