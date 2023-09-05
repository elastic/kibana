/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { merge } from 'lodash';
import { isOk, Ok, unwrap } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
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

export class TaskOverdueMetricsAggregator implements ITaskMetricsAggregator<TaskOverdueMetric> {
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

  public processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent) {
    // const { overdue }: RanTask | ErroredTask = unwrap(taskEvent.event);
    // this.overdue = overdue;
  }

  private getTaskTypeGroup(taskType: string): string | undefined {
    for (const group of taskTypeGrouping) {
      if (taskType.startsWith(group)) {
        return group.replaceAll(':', '');
      }
    }
  }
}
