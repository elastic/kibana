/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, filter } from 'rxjs/operators';
import { Logger } from 'src/core/server';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { unwrap } from '../lib/result_type';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { EphemeralTaskLifecycle } from '../ephemeral_task_lifecycle';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { isTaskRunEvent, TaskRun, ErroredTask, RanTask } from '../task_events';

interface StatusStat extends JsonObject {
  [status: string]: number;
}
interface TaskTypeStat extends JsonObject {
  [taskType: string]: {
    count: number;
    status: StatusStat;
  };
}

export interface EphemeralTaskStat extends JsonObject {
  task_types: TaskTypeStat;
}

export function createEphemeralTaskAggregator(
  ephemeralTaskLifecycle: EphemeralTaskLifecycle,
  _logger: Logger
): AggregatedStatProvider<EphemeralTaskStat> {
  const structure: EphemeralTaskStat = {
    task_types: {},
  };
  return ephemeralTaskLifecycle.events.pipe(
    filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent)),
    map((taskEvent: TaskLifecycleEvent) => {
      const { task, result }: RanTask | ErroredTask = unwrap((taskEvent as TaskRun).event);
      if (result) {
        structure.task_types[task.taskType] = structure.task_types[task.taskType] || {
          count: 0,
          status: {},
        };
        structure.task_types[task.taskType].count += 1;
        structure.task_types[task.taskType].status[result] =
          structure.task_types[task.taskType].status[result] || 0;
        structure.task_types[task.taskType].status[result] += 1;
      }
      return taskEvent;
    }),
    map((_value) => {
      return {
        key: 'ephemeral',
        value: structure,
      };
    })
  );
}
