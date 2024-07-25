/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { TaskRunner } from '../task_running';
import { CapacityOpts, ICapacity } from './types';
import { TaskDefinition } from '../task';
import { getCapacityInWorkers } from './utils';

export class WorkerCapacity implements ICapacity {
  private workers: number = 0;
  private logger: Logger;

  constructor(opts: CapacityOpts) {
    this.logger = opts.logger;
    opts.capacity$.subscribe((capacity) => {
      // Capacity config describes the number of normal-cost tasks that can be
      // run simulatenously. This directly corresponds to the number of workers to use.
      this.workers = getCapacityInWorkers(capacity);
      this.logger.debug(
        `Task pool now using ${this.workers} as the max worker value which is based on a capacity of ${capacity}`
      );
    });
  }

  public get capacity(): number {
    return this.workers;
  }

  /**
   * Gets how many workers are currently in use.
   */
  public usedCapacity(tasksInPool: Map<string, TaskRunner>) {
    return tasksInPool.size;
  }

  /**
   * Gets % of workers in use
   */
  public usedCapacityPercentage(tasksInPool: Map<string, TaskRunner>) {
    return this.capacity ? Math.round((this.usedCapacity(tasksInPool) * 100) / this.capacity) : 100;
  }

  /**
   * Gets how many workers are currently in use by each type.
   */
  public getUsedCapacityByType(tasksInPool: TaskRunner[], type: string) {
    return tasksInPool.reduce(
      (count, runningTask) => (runningTask.definition.type === type ? ++count : count),
      0
    );
  }

  public availableCapacity(
    tasksInPool: Map<string, TaskRunner>,
    taskDefinition?: TaskDefinition | null
  ): number {
    const allAvailableCapacity = this.capacity - this.usedCapacity(tasksInPool);
    if (taskDefinition && taskDefinition.maxConcurrency) {
      // calculate the max workers that can be used for this task type
      return Math.max(
        Math.min(
          allAvailableCapacity,
          taskDefinition.maxConcurrency -
            this.getUsedCapacityByType([...tasksInPool.values()], taskDefinition.type)
        ),
        0
      );
    }

    return allAvailableCapacity;
  }

  public determineTasksToRunBasedOnCapacity(
    tasks: TaskRunner[],
    availableCapacity: number
  ): [TaskRunner[], TaskRunner[]] {
    const tasksToRun: TaskRunner[] = [];
    const leftOverTasks: TaskRunner[] = [];

    for (let i = 0; i < tasks.length; i++) {
      if (i >= availableCapacity) {
        leftOverTasks.push(tasks[i]);
      } else {
        tasksToRun.push(tasks[i]);
      }
    }

    return [tasksToRun, leftOverTasks];
  }
}
