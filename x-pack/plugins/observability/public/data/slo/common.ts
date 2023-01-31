/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';

export const buildOccurrencesObjective = (
  params: Partial<SLOWithSummaryResponse['objective']> = {}
): SLOWithSummaryResponse['objective'] => {
  return {
    target: 0.99,
    ...params,
  };
};

export const buildTimeslicesObjective = (
  params: Partial<SLOWithSummaryResponse['objective']> = {}
): SLOWithSummaryResponse['objective'] => {
  return {
    target: 0.99,
    timesliceTarget: 0.95,
    timesliceWindow: '5m',
    ...params,
  };
};

export const buildHealthySummary = (
  params: Partial<SLOWithSummaryResponse['summary']> = {}
): SLOWithSummaryResponse['summary'] => {
  return {
    status: 'HEALTHY',
    sliValue: 0.99872,
    errorBudget: {
      initial: 0.02,
      consumed: 0.064,
      remaining: 0.936,
      isEstimated: false,
    },
    ...params,
  };
};

export const buildViolatedSummary = (
  params: Partial<SLOWithSummaryResponse['summary']> = {}
): SLOWithSummaryResponse['summary'] => {
  return {
    status: 'VIOLATED',
    sliValue: 0.97,
    errorBudget: {
      initial: 0.02,
      consumed: 1,
      remaining: 0,
      isEstimated: false,
    },
    ...params,
  };
};

export const buildNoDataSummary = (
  params: Partial<SLOWithSummaryResponse['summary']> = {}
): SLOWithSummaryResponse['summary'] => {
  return {
    status: 'NO_DATA',
    sliValue: -1,
    errorBudget: {
      initial: 0.02,
      consumed: 0,
      remaining: 1,
      isEstimated: false,
    },
    ...params,
  };
};

export const buildDegradingSummary = (
  params: Partial<SLOWithSummaryResponse['summary']> = {}
): SLOWithSummaryResponse['summary'] => {
  return {
    status: 'DEGRADING',
    sliValue: 0.97,
    errorBudget: {
      initial: 0.02,
      consumed: 0.88,
      remaining: 0.12,
      isEstimated: true,
    },
    ...params,
  };
};
