/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaValue, LayerValue } from '../../../types';

export const hostCount: LayerValue<FormulaValue> = {
  name: 'Hosts',
  data: {
    value: 'unique_count(host.name)',
    format: {
      id: 'number',
      params: {
        decimals: 0,
      },
    },
  },
};
