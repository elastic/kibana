/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLO, SLOList } from '../typings';
import { STATUS } from '../typings';

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
        status: STATUS.Healthy,
        sliValue: 0.99872,
        errorBudget: {
          remaining: 0.936,
          isEstimated: false,
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
        status: STATUS.Violated,
        sliValue: 0.97,
        errorBudget: {
          remaining: 0,
          isEstimated: false,
        },
      },
    },
    {
      id: 'c0f8d669-9177-4706-9098-f397a88173a7',
      name: 'availability',
      timeWindow: {
        duration: { value: 30, unit: 'd' },
      },
      objective: { target: 0.98 },
      summary: {
        status: STATUS.NoData,
        sliValue: -1,
        errorBudget: {
          remaining: 1,
          isEstimated: false,
        },
      },
    },
    {
      id: 'c0f8d669-9177-4706-9098-f397a88173a7',
      name: 'availability with timeslices',
      timeWindow: {
        duration: { value: 30, unit: 'd' },
      },
      objective: { target: 0.98 },
      summary: {
        status: STATUS.Degrading,
        sliValue: 0.97,
        errorBudget: {
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
    status: STATUS.Healthy,
    sliValue: 0.990097,
    errorBudget: {
      remaining: 0.504831,
      isEstimated: false,
    },
  },
};

export const aForecastedSLO: SLO = {
  id: '2f17deb0-725a-11ed-ab7c-4bb641cfc57e',
  name: 'SLO latency service log',
  timeWindow: {
    duration: { value: 7, unit: 'd' },
  },
  objective: {
    target: 0.98,
  },
  summary: {
    status: STATUS.Healthy,
    sliValue: 0.990097,
    errorBudget: {
      remaining: 0.504831,
      isEstimated: true,
    },
  },
};
