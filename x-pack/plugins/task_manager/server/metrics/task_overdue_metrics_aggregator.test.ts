/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asOk } from '../lib/result_type';
import { asTaskManagerMetricEvent } from '../task_events';
import { TaskManagerMetrics } from './collector/task_metrics_collector';
import { TaskOverdueMetricsAggregator } from './task_overdue_metrics_aggregator';

export const getTaskManagerMetricEvent = (value: TaskManagerMetrics) => {
  return asTaskManagerMetricEvent(asOk(value));
};

describe('TaskOverdueMetricsAggregator', () => {
  let taskOverdueMetricsAggregator: TaskOverdueMetricsAggregator;
  beforeEach(() => {
    taskOverdueMetricsAggregator = new TaskOverdueMetricsAggregator();
  });

  test('should correctly initialize', () => {
    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: 0,
      by_type: {},
    });
  });

  test('should correctly return initialMetrics', () => {
    expect(taskOverdueMetricsAggregator.initialMetric()).toEqual({
      overall: 0,
      by_type: {},
    });
  });

  test('should correctly process task manager metric event', () => {
    taskOverdueMetricsAggregator.processEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          telemetry: 2,
          total: 2,
        },
      })
    );
    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: 2,
      by_type: {
        telemetry: 2,
      },
    });
  });

  test('should correctly return latest metric event', () => {
    taskOverdueMetricsAggregator.processEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          telemetry: 2,
          total: 2,
        },
      })
    );
    taskOverdueMetricsAggregator.processEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          telemetry: 1,
          total: 1,
        },
      })
    );
    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: 1,
      by_type: {
        telemetry: 1,
      },
    });
  });

  test('should correctly group alerting and action task types', () => {
    taskOverdueMetricsAggregator.processEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          'alerting:example': 1,
          'alerting:.index-threshold': 3,
          'actions:webhook': 2,
          'actions:.email': 1,
          total: 7,
        },
      })
    );

    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: 7,
      by_type: {
        'alerting:example': 1,
        'alerting:__index-threshold': 3,
        alerting: 4,
        'actions:webhook': 2,
        'actions:__email': 1,
        actions: 3,
      },
    });
  });

  test('should correctly ignore reset events', () => {
    taskOverdueMetricsAggregator.processEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          'alerting:example': 1,
          'alerting:.index-threshold': 3,
          'actions:webhook': 2,
          'actions:.email': 1,
          total: 7,
        },
      })
    );
    taskOverdueMetricsAggregator.reset();
    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: 7,
      by_type: {
        'alerting:example': 1,
        'alerting:__index-threshold': 3,
        alerting: 4,
        'actions:webhook': 2,
        'actions:__email': 1,
        actions: 3,
      },
    });
  });
});
