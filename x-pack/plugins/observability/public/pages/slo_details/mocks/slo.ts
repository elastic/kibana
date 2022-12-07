/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO } from '../../../typings';

export const anSLO: SLO = {
  id: '2f17deb0-725a-11ed-ab7c-4bb641cfc57e',
  name: 'SLO latency service log',
  timeWindow: {
    duration: { value: 7, unit: 'd' },
  },
  objective: {
    target: 0.98,
  },
  summary: {
    sliValue: 0.990097,
    errorBudget: {
      remaining: 0.504831,
    },
  },
};
