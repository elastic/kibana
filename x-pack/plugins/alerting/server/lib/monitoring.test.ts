/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExecutionDurationPercentiles } from './monitoring';
import { RuleMonitoring } from '../types';

const mockHistory = [
  {
    success: true,
    duration: 100,
  },
  {
    success: true,
    duration: 200,
  },
  {
    success: false,
    duration: 300,
  },
  {
    success: false,
    duration: 100,
  },
  {
    success: false,
  },
  {
    success: true,
  },
  {
    success: true,
    duration: 400,
  },
  {
    success: true,
    duration: 500,
  },
];

const mockRuleMonitoring = {
  execution: {
    history: mockHistory,
    calculated_metrics: {
      success_ratio: 0,
    },
  },
} as RuleMonitoring;

describe('getExecutionDurationPercentiles', () => {
  it('Calculates the percentile given partly undefined durations', () => {
    const percentiles = getExecutionDurationPercentiles(mockRuleMonitoring);
    expect(percentiles.p50).toEqual(250);
    expect(percentiles.p95).toEqual(500);
    expect(percentiles.p99).toEqual(500);
  });

  it('Returns empty object when given all undefined durations', () => {
    // remove all duration fields
    const nullDurationHistory = mockHistory.map((history) => ({
      success: history.success,
    }));

    const newMockRuleMonitoring = {
      ...mockRuleMonitoring,
      execution: {
        ...mockRuleMonitoring.execution,
        history: nullDurationHistory,
      },
    } as RuleMonitoring;

    const percentiles = getExecutionDurationPercentiles(newMockRuleMonitoring);
    expect(Object.keys(percentiles).length).toEqual(0);
  });
});
