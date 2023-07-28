/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaConfig } from '../../../types';

export const logRate: FormulaConfig = {
  label: 'Log Rate',
  value: 'differences(cumulative_sum(count()))',
  format: {
    id: 'number',
    params: {
      decimals: 0,
    },
  },
  timeScale: 's',
};
