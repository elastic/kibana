/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLO, SLOList } from '../../public';

export const emptySloList: SLOList = {
  results: [],
  page: 1,
  perPage: 25,
  total: 0,
};

export const sloList: SLOList = {
  results: [
    {
      id: '1f1c6ee7-433f-4b56-b727-5682262e0d7d',
      name: 'latency',
      timeWindow: {
        duration: { value: 7, unit: 'd' },
      },
      objective: { target: 0.98 },
      summary: {
        sliValue: 0.99872,
        errorBudget: {
          remaining: 0.936,
        },
      },
    },
    {
      id: 'c0f8d669-9177-4706-9098-f397a88173a6',
      name: 'availability',
      timeWindow: {
        duration: { value: 30, unit: 'd' },
      },
      objective: { target: 0.98 },
      summary: {
        sliValue: 0.97,
        errorBudget: {
          remaining: 0,
        },
      },
    },
  ],
  page: 1,
  perPage: 25,
  total: 2,
};

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
