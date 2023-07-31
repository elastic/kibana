/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { isOk, unwrap } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { ErroredTask, RanTask, TaskRun } from '../task_events';
import { SuccessRate, SuccessRateCounter } from './success_rate_counter';
import { ITaskMetricsAggregator } from './types';

const taskTypeGrouping = new Set<string>(['alerting:', 'actions:']);

export interface TaskRunMetric extends JsonObject {
  overall: SuccessRate;
  by_type: {
    [key: string]: SuccessRate;
  };
}

export class TaskRunMetricsAggregator implements ITaskMetricsAggregator<TaskRunMetric> {
  private taskRunSuccessRate = new SuccessRateCounter();
  private taskRunCounter: Map<string, SuccessRateCounter> = new Map();

  public initialMetric(): TaskRunMetric {
    return {
      overall: this.taskRunSuccessRate.initialMetric(),
      by_type: {},
    };
  }

  public collect(): TaskRunMetric {
    return {
      overall: this.taskRunSuccessRate.get(),
      by_type: this.collectTaskTypeEntries(),
    };
  }

  public reset() {
    this.taskRunSuccessRate.reset();
    for (const taskType of this.taskRunCounter.keys()) {
      this.taskRunCounter.get(taskType)!.reset();
    }
  }

  public processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent) {
    const { task }: RanTask | ErroredTask = unwrap((taskEvent as TaskRun).event);
    const taskType = task.taskType;

    const taskTypeSuccessRate: SuccessRateCounter =
      this.taskRunCounter.get(taskType) ?? new SuccessRateCounter();

    const success = isOk((taskEvent as TaskRun).event);
    this.taskRunSuccessRate.increment(success);
    taskTypeSuccessRate.increment(success);
    this.taskRunCounter.set(taskType, taskTypeSuccessRate);

    const taskTypeGroup = this.getTaskTypeGroup(taskType);
    if (taskTypeGroup) {
      const taskTypeGroupSuccessRate: SuccessRateCounter =
        this.taskRunCounter.get(taskTypeGroup) ?? new SuccessRateCounter();
      taskTypeGroupSuccessRate.increment(success);
      this.taskRunCounter.set(taskTypeGroup, taskTypeGroupSuccessRate);
    }
  }

  private collectTaskTypeEntries() {
    const collected: Record<string, SuccessRate> = {};
    for (const [key, value] of this.taskRunCounter) {
      collected[key] = value.get();
    }
    return collected;
  }

  private getTaskTypeGroup(taskType: string): string | undefined {
    for (const group of taskTypeGrouping) {
      if (taskType.startsWith(group)) {
        return group.replaceAll(':', '');
      }
    }
  }
}
