/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConcreteTaskInstance } from '../../task';
import { isLimited, TaskClaimingBatches } from '../../queries/task_claiming';

// given a list of tasks and capacity info, select the tasks that meet capacity
export function selectTasksByCapacity(
  tasks: ConcreteTaskInstance[],
  batches: TaskClaimingBatches
): ConcreteTaskInstance[] {
  // create a map of task type - concurrency
  const limitedBatches = batches.filter(isLimited);
  const limitedMap = new Map<string, number>();
  for (const limitedBatch of limitedBatches) {
    const { tasksTypes, concurrency } = limitedBatch;
    limitedMap.set(tasksTypes, concurrency);
  }

  // apply the limited concurrency
  const result: ConcreteTaskInstance[] = [];
  for (const task of tasks) {
    const concurrency = limitedMap.get(task.taskType);
    if (concurrency == null) {
      result.push(task);
      continue;
    }

    if (concurrency > 0) {
      result.push(task);
      limitedMap.set(task.taskType, concurrency - 1);
    }
  }

  return result;
}
