/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLOList, SLO } from '../../public';

export const slo: SLO = {
  id: '1f1c6ee7-433f-4b56-b727-5682262e0d7d',
  name: 'latency',
  objective: { target: 0.98 },
  summary: {
    sliValue: 0.99872,
    errorBudget: {
      remaining: 0.936,
    },
  },
};

export const slo2: SLO = {
  id: 'c0f8d669-9177-4706-9098-f397a88173a6',
  name: 'availability',
  objective: { target: 0.98 },
  summary: {
    sliValue: 0.97,
    errorBudget: {
      remaining: 0,
    },
  },
};

export const emptySloList: SLOList = {
  results: [],
  page: 1,
  perPage: 25,
  total: 0,
};

export const sloList: SLOList = {
  results: [slo, slo2],
  page: 1,
  perPage: 25,
  total: 2,
};
