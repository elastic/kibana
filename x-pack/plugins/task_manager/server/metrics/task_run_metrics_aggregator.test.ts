/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as uuid from 'uuid';
import { asOk, asErr } from '../lib/result_type';
import { TaskStatus } from '../task';
import {
  asTaskManagerStatEvent,
  asTaskRunEvent,
  TaskManagerStats,
  TaskPersistence,
} from '../task_events';
import { TaskRunResult } from '../task_running';
import { TaskRunMetricsAggregator } from './task_run_metrics_aggregator';

export const getTaskRunSuccessEvent = (type: string, isExpired: boolean = false) => {
  const id = uuid.v4();
  return asTaskRunEvent(
    id,
    asOk({
      task: {
        id,
        attempts: 0,
        status: TaskStatus.Running,
        version: '123',
        runAt: new Date(),
        scheduledAt: new Date(),
        startedAt: new Date(),
        retryAt: new Date(Date.now() + 5 * 60 * 1000),
        state: {},
        taskType: type,
        params: {},
        ownerId: null,
      },
      persistence: TaskPersistence.Recurring,
      result: TaskRunResult.Success,
      isExpired,
    }),
    {
      start: 1689698780490,
      stop: 1689698780500,
    }
  );
};

export const getTaskRunFailedEvent = (type: string, isExpired: boolean = false) => {
  const id = uuid.v4();
  return asTaskRunEvent(
    id,
    asErr({
      error: new Error('task failed to run'),
      task: {
        id,
        attempts: 0,
        status: TaskStatus.Running,
        version: '123',
        runAt: new Date(),
        scheduledAt: new Date(),
        startedAt: new Date(),
        retryAt: new Date(Date.now() + 5 * 60 * 1000),
        state: {},
        taskType: type,
        params: {},
        ownerId: null,
      },
      persistence: TaskPersistence.Recurring,
      result: TaskRunResult.Failed,
      isExpired,
    })
  );
};

export const getTaskManagerStatEvent = (value: number, id: TaskManagerStats = 'runDelay') => {
  return asTaskManagerStatEvent(id, asOk(value));
};

describe('TaskRunMetricsAggregator', () => {
  let taskRunMetricsAggregator: TaskRunMetricsAggregator;
  beforeEach(() => {
    taskRunMetricsAggregator = new TaskRunMetricsAggregator();
  });

  test('should correctly initialize', () => {
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 0, on_time: 0, total: 0, delay: { counts: [], values: [] } },
    });
  });

  test('should correctly return initialMetrics', () => {
    expect(taskRunMetricsAggregator.initialMetric()).toEqual({
      overall: { success: 0, on_time: 0, total: 0, delay: { counts: [], values: [] } },
      by_type: {},
    });
  });

  test('should correctly process task run success event', () => {
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('telemetry'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('telemetry'));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 2, on_time: 2, total: 2, delay: { counts: [], values: [] } },
      by_type: {
        telemetry: { success: 2, on_time: 2, total: 2 },
      },
    });
  });

  test('should correctly process task manager runDelay stat', () => {
    taskRunMetricsAggregator.processEvent(getTaskManagerStatEvent(3.343));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 0, on_time: 0, total: 0, delay: { counts: [1], values: [10] } },
    });
  });

  test('should ignore task manager stats that are not runDelays', () => {
    taskRunMetricsAggregator.processEvent(getTaskManagerStatEvent(3.343, 'pollingDelay'));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 0, on_time: 0, total: 0, delay: { counts: [], values: [] } },
    });
  });

  test('should correctly process task run success event where task run has timed out', () => {
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('telemetry', true));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('telemetry', true));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 2, on_time: 0, total: 2, delay: { counts: [], values: [] } },
      by_type: {
        telemetry: { success: 2, on_time: 0, total: 2 },
      },
    });
  });

  test('should correctly process task run failure event', () => {
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('telemetry'));
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('telemetry'));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 0, on_time: 2, total: 2, delay: { counts: [], values: [] } },
      by_type: {
        telemetry: { success: 0, on_time: 2, total: 2 },
      },
    });
  });

  test('should correctly process task run failure event where task run has timed out', () => {
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('telemetry', true));
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('telemetry', true));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 0, on_time: 0, total: 2, delay: { counts: [], values: [] } },
      by_type: {
        telemetry: { success: 0, on_time: 0, total: 2 },
      },
    });
  });

  test('should correctly process different task types', () => {
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('telemetry'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('report', true));
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('telemetry'));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 3, on_time: 3, total: 4, delay: { counts: [], values: [] } },
      by_type: {
        report: { success: 2, on_time: 1, total: 2 },
        telemetry: { success: 1, on_time: 2, total: 2 },
      },
    });
  });

  test('should correctly group alerting and action task types', () => {
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('telemetry'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('telemetry'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('alerting:example', true));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('alerting:.index-threshold'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('actions:webhook'));
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('alerting:example'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('actions:webhook'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('alerting:example'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('actions:.email'));
    taskRunMetricsAggregator.processEvent(
      getTaskRunSuccessEvent('alerting:.index-threshold', true)
    );
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 11, on_time: 12, total: 14, delay: { counts: [], values: [] } },
      by_type: {
        actions: { success: 3, on_time: 3, total: 3 },
        'actions:__email': { success: 1, on_time: 1, total: 1 },
        'actions:webhook': { success: 2, on_time: 2, total: 2 },
        alerting: { success: 5, on_time: 5, total: 7 },
        'alerting:example': { success: 3, on_time: 4, total: 5 },
        'alerting:__index-threshold': { success: 2, on_time: 1, total: 2 },
        report: { success: 2, on_time: 2, total: 2 },
        telemetry: { success: 1, on_time: 2, total: 2 },
      },
    });
  });

  test('should correctly reset counter', () => {
    taskRunMetricsAggregator.processEvent(getTaskManagerStatEvent(3.343));
    taskRunMetricsAggregator.processEvent(getTaskManagerStatEvent(25.45));
    taskRunMetricsAggregator.processEvent(getTaskManagerStatEvent(6.4478));
    taskRunMetricsAggregator.processEvent(getTaskManagerStatEvent(9.241));

    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('telemetry'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('telemetry'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('alerting:example', true));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processEvent(
      getTaskRunSuccessEvent('alerting:.index-threshold', true)
    );
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('actions:webhook'));
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('alerting:example'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('actions:webhook'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processEvent(getTaskRunFailedEvent('alerting:example'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('actions:.email'));
    taskRunMetricsAggregator.processEvent(getTaskRunSuccessEvent('alerting:.index-threshold'));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: {
        success: 11,
        on_time: 12,
        total: 14,
        delay: { counts: [3, 0, 1], values: [10, 20, 30] },
      },
      by_type: {
        actions: { success: 3, on_time: 3, total: 3 },
        'actions:__email': { success: 1, on_time: 1, total: 1 },
        'actions:webhook': { success: 2, on_time: 2, total: 2 },
        alerting: { success: 5, on_time: 5, total: 7 },
        'alerting:example': { success: 3, on_time: 4, total: 5 },
        'alerting:__index-threshold': { success: 2, on_time: 1, total: 2 },
        report: { success: 2, on_time: 2, total: 2 },
        telemetry: { success: 1, on_time: 2, total: 2 },
      },
    });

    taskRunMetricsAggregator.reset();
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 0, on_time: 0, total: 0, delay: { counts: [], values: [] } },
      by_type: {
        actions: { success: 0, on_time: 0, total: 0 },
        'actions:__email': { success: 0, on_time: 0, total: 0 },
        'actions:webhook': { success: 0, on_time: 0, total: 0 },
        alerting: { success: 0, on_time: 0, total: 0 },
        'alerting:example': { success: 0, on_time: 0, total: 0 },
        'alerting:__index-threshold': { success: 0, on_time: 0, total: 0 },
        report: { success: 0, on_time: 0, total: 0 },
        telemetry: { success: 0, on_time: 0, total: 0 },
      },
    });
  });
});
