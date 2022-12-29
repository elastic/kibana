/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSLOResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';

export const emptySloList: FindSLOResponse = {
  results: [],
  page: 1,
  perPage: 25,
  total: 0,
};

const now = '2022-12-29T10:11:12.000Z';

const baseSlo: Omit<SLOWithSummaryResponse, 'id'> = {
  name: 'irrelevant',
  description: 'irrelevant',
  indicator: {
    type: 'sli.kql.custom' as const,
    params: {
      index: 'some-index',
      filter: 'baz: foo and bar > 2',
      good: 'http_status: 2xx',
      total: '',
    },
  },
  timeWindow: {
    duration: '30d',
    isRolling: true,
  },
  objective: { target: 0.98 },
  budgetingMethod: 'occurrences',
  revision: 1,
  settings: {
    timestampField: '@timestamp',
    syncDelay: '1m',
    frequency: '1m',
  },
  summary: {
    status: 'HEALTHY',
    sliValue: 0.99872,
    errorBudget: {
      initial: 0.02,
      consumed: 0.064,
      remaining: 0.936,
      isEstimated: false,
    },
  },
  createdAt: now,
  updatedAt: now,
};

export const sloList: FindSLOResponse = {
  results: [
    {
      ...baseSlo,
      id: '1f1c6ee7-433f-4b56-b727-5682262e0d7d',
      summary: {
        status: 'HEALTHY',
        sliValue: 0.99872,
        errorBudget: {
          initial: 0.02,
          consumed: 0.064,
          remaining: 0.936,
          isEstimated: false,
        },
      },
    },
    {
      ...baseSlo,
      id: 'c0f8d669-9177-4706-9098-f397a88173a6',
      summary: {
        status: 'VIOLATED',
        sliValue: 0.97,
        errorBudget: {
          initial: 0.02,
          consumed: 1,
          remaining: 0,
          isEstimated: false,
        },
      },
    },
    {
      ...baseSlo,
      id: 'c0f8d669-9177-4706-9098-f397a88173a7',
      summary: {
        status: 'NO_DATA',
        sliValue: -1,
        errorBudget: {
          initial: 0.02,
          consumed: 0,
          remaining: 1,
          isEstimated: false,
        },
      },
    },
    {
      ...baseSlo,
      id: 'c0f8d669-9177-4706-9098-f397a88173a7',
      budgetingMethod: 'timeslices',
      objective: { target: 0.98, timesliceTarget: 0.9, timesliceWindow: '5m' },
      summary: {
        status: 'DEGRADING',
        sliValue: 0.97,
        errorBudget: {
          initial: 0.02,
          consumed: 0.88,
          remaining: 0.12,
          isEstimated: false,
        },
      },
    },
  ],
  page: 1,
  perPage: 25,
  total: 4,
};

export const anSLO: SLOWithSummaryResponse = {
  ...baseSlo,
  id: '2f17deb0-725a-11ed-ab7c-4bb641cfc57e',
};

export const aForecastedSLO: SLOWithSummaryResponse = {
  ...baseSlo,
  id: '2f17deb0-725a-11ed-ab7c-4bb641cfc57e',
  summary: {
    status: 'HEALTHY',
    sliValue: 0.990097,
    errorBudget: {
      initial: 0.02,
      consumed: 0.495169,
      remaining: 0.504831,
      isEstimated: true,
    },
  },
};
