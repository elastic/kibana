/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, FindSLOResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { cloneDeep } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  buildDegradingSummary,
  buildHealthySummary,
  buildNoDataSummary,
  buildOccurrencesObjective,
  buildTimeslicesObjective,
  buildViolatedSummary,
} from './common';
import { buildApmAvailabilityIndicator, buildCustomKqlIndicator } from './indicator';
import { buildCalendarAlignedTimeWindow, buildRollingTimeWindow } from './time_window';

export const emptySloList: FindSLOResponse = {
  results: [],
  page: 1,
  perPage: 25,
  total: 0,
};

const now = '2022-12-29T10:11:12.000Z';

const baseSlo: Omit<SLOWithSummaryResponse, 'id'> = {
  name: 'super important level service',
  description: 'some description useful',
  indicator: {
    type: 'sli.kql.custom',
    params: {
      index: 'some-index',
      filter: 'baz: foo and bar > 2',
      good: 'http_status: 2xx',
      total: 'a query',
      timestampField: 'custom_timestamp',
    },
  },
  timeWindow: {
    duration: '30d',
    type: 'rolling',
  },
  objective: { target: 0.98 },
  budgetingMethod: 'occurrences',
  revision: 1,
  settings: {
    syncDelay: '1m',
    frequency: '1m',
    preventInitialBackfill: false,
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
    fiveMinuteBurnRate: 0,
    oneHourBurnRate: 0,
    oneDayBurnRate: 0,
  },
  groupBy: ALL_VALUE,
  groupings: {},
  instanceId: ALL_VALUE,
  tags: ['k8s', 'production', 'critical'],
  enabled: true,
  createdAt: now,
  updatedAt: now,
  version: 2,
  meta: {},
};

export const sloList: FindSLOResponse = {
  results: [
    {
      ...baseSlo,
      id: '1f1c6ee7-433f-4b56-b727-5682262e0d7d',
      indicator: buildCustomKqlIndicator(),
      summary: buildHealthySummary(),
      timeWindow: buildRollingTimeWindow(),
    },
    {
      ...baseSlo,
      id: '1f1c6ee7-433f-4b56-b727-5682262e0d7e',
      indicator: buildApmAvailabilityIndicator(),
      summary: buildHealthySummary(),
      timeWindow: buildCalendarAlignedTimeWindow(),
    },
    {
      ...baseSlo,
      id: 'c0f8d669-9177-4706-9098-f397a88173a6',
      summary: buildViolatedSummary(),
      indicator: buildApmAvailabilityIndicator(),
      timeWindow: buildCalendarAlignedTimeWindow(),
    },
    {
      ...baseSlo,
      id: 'c0f8d669-9277-4706-9098-f397a88173a6',
      summary: buildViolatedSummary(),
      timeWindow: buildRollingTimeWindow({ duration: '7d' }),
    },
    {
      ...baseSlo,
      id: 'c0f8d669-9177-4706-9098-f397a88173a7',
      summary: buildNoDataSummary(),
    },
    {
      ...baseSlo,
      id: 'c0f8d669-9177-4706-9098-f397a88173b7',
      summary: buildNoDataSummary(),
      indicator: buildApmAvailabilityIndicator(),
      timeWindow: buildCalendarAlignedTimeWindow(),
    },
    {
      ...baseSlo,
      id: 'c0f8d669-9177-4706-9098-f397a88173a8',
      budgetingMethod: 'timeslices',
      timeWindow: buildCalendarAlignedTimeWindow(),
      objective: buildTimeslicesObjective(),
      summary: buildDegradingSummary(),
    },
    {
      ...baseSlo,
      id: 'c0f8d669-9177-4706-9098-f397a88173a9',
      objective: buildOccurrencesObjective(),
      timeWindow: buildCalendarAlignedTimeWindow(),
      summary: buildDegradingSummary(),
      indicator: buildApmAvailabilityIndicator(),
    },
  ],
  page: 1,
  perPage: 25,
  total: 4,
};

export function buildForecastedSlo(
  params: Partial<SLOWithSummaryResponse> = {}
): SLOWithSummaryResponse {
  return buildSlo({
    timeWindow: buildCalendarAlignedTimeWindow(),
    summary: buildHealthySummary({
      errorBudget: {
        initial: 0.02,
        consumed: 0.064,
        remaining: 0.936,
        isEstimated: true,
      },
    }),
    ...params,
  });
}

export function buildSlo(params: Partial<SLOWithSummaryResponse> = {}): SLOWithSummaryResponse {
  return cloneDeep({ ...baseSlo, id: uuidv4(), ...params });
}
