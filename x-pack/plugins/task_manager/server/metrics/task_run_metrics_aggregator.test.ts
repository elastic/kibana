/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as uuid from 'uuid';
import { asOk, asErr } from '../lib/result_type';
import { TaskStatus } from '../task';
import { asTaskRunEvent, TaskPersistence } from '../task_events';
import { TaskRunResult } from '../task_running';
import { TaskRunMetricsAggregator } from './task_run_metrics_aggregator';

export const getTaskRunSuccessEvent = (type: string) => {
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
    }),
    {
      start: 1689698780490,
      stop: 1689698780500,
    }
  );
};

export const getTaskRunFailedEvent = (type: string) => {
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
    })
  );
};

describe('TaskRunMetricsAggregator', () => {
  let taskRunMetricsAggregator: TaskRunMetricsAggregator;
  beforeEach(() => {
    taskRunMetricsAggregator = new TaskRunMetricsAggregator();
  });

  test('should correctly initialize', () => {
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 0, total: 0, delay: { counts: [], values: [] } },
    });
  });

  test('should correctly return initialMetrics', () => {
    expect(taskRunMetricsAggregator.initialMetric()).toEqual({
      overall: { success: 0, total: 0, delay: { counts: [], values: [] } },
      by_type: {},
    });
  });

  test('should correctly process task run success event', () => {
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('telemetry'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('telemetry'));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 2, total: 2, delay: { counts: [], values: [] } },
      by_type: {
        telemetry: { success: 2, total: 2 },
      },
    });
  });

  test('should correctly process task run failure event', () => {
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunFailedEvent('telemetry'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunFailedEvent('telemetry'));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 0, total: 2, delay: { counts: [], values: [] } },
      by_type: {
        telemetry: { success: 0, total: 2 },
      },
    });
  });

  test('should correctly process different task types', () => {
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('telemetry'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunFailedEvent('telemetry'));
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 3, total: 4, delay: { counts: [], values: [] } },
      by_type: {
        report: { success: 2, total: 2 },
        telemetry: { success: 1, total: 2 },
      },
    });
  });

  test('should correctly group alerting and action task types', () => {
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('telemetry'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunFailedEvent('telemetry'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(
      getTaskRunSuccessEvent('alerting:.index-threshold')
    );
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('actions:webhook'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunFailedEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('actions:webhook'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunFailedEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('actions:.email'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(
      getTaskRunSuccessEvent('alerting:.index-threshold')
    );
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 11, total: 14, delay: { counts: [], values: [] } },
      by_type: {
        actions: { success: 3, total: 3 },
        'actions:.email': { success: 1, total: 1 },
        'actions:webhook': { success: 2, total: 2 },
        alerting: { success: 5, total: 7 },
        'alerting:example': { success: 3, total: 5 },
        'alerting:.index-threshold': { success: 2, total: 2 },
        report: { success: 2, total: 2 },
        telemetry: { success: 1, total: 2 },
      },
    });
  });

  test('should correctly reset counter', () => {
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('telemetry'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('report'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunFailedEvent('telemetry'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(
      getTaskRunSuccessEvent('alerting:.index-threshold')
    );
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('actions:webhook'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunFailedEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('actions:webhook'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunFailedEvent('alerting:example'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(getTaskRunSuccessEvent('actions:.email'));
    taskRunMetricsAggregator.processTaskLifecycleEvent(
      getTaskRunSuccessEvent('alerting:.index-threshold')
    );
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 11, total: 14, delay: { counts: [], values: [] } },
      by_type: {
        actions: { success: 3, total: 3 },
        'actions:.email': { success: 1, total: 1 },
        'actions:webhook': { success: 2, total: 2 },
        alerting: { success: 5, total: 7 },
        'alerting:example': { success: 3, total: 5 },
        'alerting:.index-threshold': { success: 2, total: 2 },
        report: { success: 2, total: 2 },
        telemetry: { success: 1, total: 2 },
      },
    });

    taskRunMetricsAggregator.reset();
    expect(taskRunMetricsAggregator.collect()).toEqual({
      overall: { success: 0, total: 0 },
      by_type: {
        actions: { success: 0, total: 0 },
        'actions:.email': { success: 0, total: 0 },
        'actions:webhook': { success: 0, total: 0 },
        alerting: { success: 0, total: 0 },
        'alerting:example': { success: 0, total: 0 },
        'alerting:.index-threshold': { success: 0, total: 0 },
        report: { success: 0, total: 0 },
        telemetry: { success: 0, total: 0 },
      },
    });
  });
});
