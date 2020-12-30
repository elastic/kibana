/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import StatsMock from './__mocks__/analytics_stats.json';

import {
  getDataFrameAnalyticsProgress,
  getDataFrameAnalyticsProgressPhase,
  isCompletedAnalyticsJob,
  isDataFrameAnalyticsRunning,
  isDataFrameAnalyticsStats,
  DataFrameAnalyticsStats,
  DATA_FRAME_TASK_STATE,
} from './common';

const completedJob = StatsMock.data_frame_analytics[0] as DataFrameAnalyticsStats;
const runningJob = StatsMock.data_frame_analytics[1] as DataFrameAnalyticsStats;

describe('Data Frame Analytics: isCompletedAnalyticsJob()', () => {
  test('should report if job is completed', () => {
    expect(isCompletedAnalyticsJob(completedJob)).toBe(true);
    expect(isCompletedAnalyticsJob(runningJob)).toBe(false);
  });
});

describe('Data Frame Analytics: isDataFrameAnalyticsRunning()', () => {
  test('should report if job is running', () => {
    expect(isDataFrameAnalyticsRunning(completedJob.state)).toBe(false);
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(true);
    runningJob.state = DATA_FRAME_TASK_STATE.STARTED;
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(true);
    runningJob.state = DATA_FRAME_TASK_STATE.STARTING;
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(true);
    runningJob.state = DATA_FRAME_TASK_STATE.REINDEXING;
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(true);
    runningJob.state = DATA_FRAME_TASK_STATE.FAILED;
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(false);
  });
});

describe('Data Frame Analytics: isDataFrameAnalyticsStats()', () => {
  test('should return if valid analytics stats', () => {
    expect(isDataFrameAnalyticsStats(completedJob)).toBe(true);
    expect(isDataFrameAnalyticsStats(runningJob)).toBe(true);
    expect(isDataFrameAnalyticsStats({})).toBe(false);
    expect(isDataFrameAnalyticsStats('no-object')).toBe(false);
  });
});

describe('Data Frame Analytics: getDataFrameAnalyticsProgress()', () => {
  test('should report overall job progress percentage', () => {
    expect(getDataFrameAnalyticsProgress(completedJob)).toBe(100);
    expect(getDataFrameAnalyticsProgress(runningJob)).toBe(59);
  });
});

describe('Data Frame Analytics: getDataFrameAnalyticsProgressPhase()', () => {
  test('should report progress by current phase', () => {
    expect(getDataFrameAnalyticsProgressPhase(completedJob)).toStrictEqual({
      currentPhase: 4,
      progress: 100,
      totalPhases: 4,
    });
    expect(getDataFrameAnalyticsProgressPhase(runningJob)).toStrictEqual({
      currentPhase: 3,
      progress: 37,
      totalPhases: 4,
    });
  });
});
