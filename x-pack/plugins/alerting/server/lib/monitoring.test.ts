/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getExecutionDurationPercentiles,
  updateMonitoring,
  convertMonitoringFromRawAndVerify,
} from './monitoring';
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
  run: {
    history: mockHistory,
    calculated_metrics: {
      success_ratio: 0,
    },
    last_run: {
      timestamp: '2022-06-18T01:00:00.000Z',
      metrics: {
        duration: 123,
      },
    },
  },
} as RuleMonitoring;

describe('getExecutionDurationPercentiles', () => {
  it('Calculates the percentile given partly undefined durations', () => {
    const percentiles = getExecutionDurationPercentiles(mockRuleMonitoring.run.history);
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
      run: {
        ...mockRuleMonitoring.run,
        history: nullDurationHistory,
      },
    } as RuleMonitoring;

    const percentiles = getExecutionDurationPercentiles(newMockRuleMonitoring.run.history);
    expect(Object.keys(percentiles).length).toEqual(0);
  });
});

describe('updateMonitoring', () => {
  it('can update monitoring', () => {
    const result = updateMonitoring({
      monitoring: mockRuleMonitoring,
      timestamp: '2022-07-18T01:00:00.000Z',
      duration: 1000,
    });

    expect(result.run.history).toEqual(mockRuleMonitoring.run.history);
    expect(result.run.calculated_metrics).toEqual(mockRuleMonitoring.run.calculated_metrics);
    expect(result.run.last_run.timestamp).toEqual('2022-07-18T01:00:00.000Z');
    expect(result.run.last_run.metrics.duration).toEqual(1000);
  });
});

describe('convertMonitoringFromRawAndVerify', () => {
  it('can convert monitoring to raw and verify the duration', () => {
    const monitoring = {
      run: {
        ...mockRuleMonitoring.run,
        last_run: {
          ...mockRuleMonitoring.run.last_run,
          timestamp: 'invalid',
        },
      },
    };

    const mockLoggerDebug = jest.fn();
    const mockLogger = {
      debug: mockLoggerDebug,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = convertMonitoringFromRawAndVerify(mockLogger as any, '123', monitoring);
    expect(mockLoggerDebug).toHaveBeenCalledWith(
      'invalid monitoring last_run.timestamp "invalid" in raw rule 123'
    );
    expect(Date.parse(result!.run.last_run.timestamp)).toBeTruthy();
  });
});
