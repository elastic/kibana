/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { isOk, unwrap } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskManagerMetric } from '../task_events';
import { TaskManagerMetrics } from './collector/task_metrics_collector';
import { ITaskMetricsAggregator } from './types';

const taskTypeGrouping = new Set<string>(['alerting:', 'actions:']);

enum TaskOverdueMetricKeys {
  OVERALL = 'overall',
  BY_TYPE = 'by_type',
}

export interface TaskOverdueMetric extends JsonObject {
  [TaskOverdueMetricKeys.OVERALL]: number;
  [TaskOverdueMetricKeys.BY_TYPE]: {
    [key: string]: number;
  };
}

export class TaskOverdueMetricsAggregator
  implements ITaskMetricsAggregator<TaskOverdueMetric, TaskLifecycleEvent>
{
  private overdue: TaskOverdueMetric = {
    [TaskOverdueMetricKeys.OVERALL]: 0,
    [TaskOverdueMetricKeys.BY_TYPE]: {},
  };

  public initialMetric(): TaskOverdueMetric {
    return {
      [TaskOverdueMetricKeys.OVERALL]: 0,
      [TaskOverdueMetricKeys.BY_TYPE]: {},
    };
  }

  public collect(): TaskOverdueMetric {
    return this.overdue;
  }

  public reset() {
    // no-op because this metric is not a counter
  }

  public processEvent(taskEvent: TaskLifecycleEvent) {
    let metric: TaskManagerMetrics;
    if (isOk((taskEvent as TaskManagerMetric).event)) {
      metric = unwrap((taskEvent as TaskManagerMetric).event) as TaskManagerMetrics;

      this.overdue = Object.keys(metric.numOverdueTasks).reduce(
        (acc: TaskOverdueMetric, key: string) => {
          if (key === 'total') {
            acc[TaskOverdueMetricKeys.OVERALL] = metric.numOverdueTasks[key];
          } else {
            const taskType = key.replaceAll('.', '__');
            const taskTypeGroup = this.getTaskTypeGroup(taskType);

            acc[TaskOverdueMetricKeys.BY_TYPE][taskType] = metric.numOverdueTasks[key];
            if (taskTypeGroup) {
              const currCount = acc[TaskOverdueMetricKeys.BY_TYPE][taskTypeGroup] ?? 0;
              acc[TaskOverdueMetricKeys.BY_TYPE][taskTypeGroup] =
                currCount + metric.numOverdueTasks[key];
            }
          }

          return acc;
        },
        {
          [TaskOverdueMetricKeys.OVERALL]: 0,
          [TaskOverdueMetricKeys.BY_TYPE]: {},
        }
      );
    }
  }

  private getTaskTypeGroup(taskType: string): string | undefined {
    for (const group of taskTypeGrouping) {
      if (taskType.startsWith(group)) {
        return group.replaceAll(':', '');
      }
    }
  }
}
