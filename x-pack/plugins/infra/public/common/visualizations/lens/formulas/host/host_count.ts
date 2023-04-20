/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensChartConfig } from '../../../types';
import { getFilters } from './utils';

export const hostCount: LensChartConfig = {
  title: 'Hosts',
  formula: {
    formula: 'unique_count(host.name)',
    format: {
      id: 'number',
      params: {
        decimals: 0,
      },
    },
  },
  getFilters,
};
