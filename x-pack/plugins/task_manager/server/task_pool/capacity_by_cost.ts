/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { TaskDefinition } from '../task';
import { TaskRunner } from '../task_running';
import { CapacityCalculatorOpts, ICapacityCalculator } from './types';
export class CapacityByCost implements ICapacityCalculator {
  private _capacity: number = 0;
  private logger: Logger;

  constructor(opts: CapacityCalculatorOpts) {
    this.logger = opts.logger;
    opts.capacity$.subscribe((capacity) => {
      this.logger.debug(`Task pool now using ${capacity} as the capacity value`);
      this._capacity = capacity;
    });
  }

  public get capacity(): number {
    return this._capacity;
  }

  /**
   * Gets how much capacity is currently in use.
   */
  public usedCapacity(tasksInPool: Map<string, TaskRunner>) {
    let result = 0;
    tasksInPool.forEach((task) => {
      result += task.definition.cost;
    });
    return result;
  }

  /**
   * Gets % of capacity in use
   */
  public usedCapacityPercentage(tasksInPool: Map<string, TaskRunner>) {
    return this.capacity ? Math.round((this.usedCapacity(tasksInPool) * 100) / this.capacity) : 100;
  }

  /**
   * Gets how much capacity is currently in use by each type.
   */
  public getUsedCapacityByType(tasksInPool: TaskRunner[], type: string) {
    return tasksInPool.reduce(
      (count, runningTask) =>
        runningTask.definition.type === type ? count + runningTask.definition.cost : count,
      0
    );
  }

  public availableCapacity(
    tasksInPool: Map<string, TaskRunner>,
    taskDefinition?: TaskDefinition | null
  ): number {
    const allAvailableCapacity = this.capacity - this.usedCapacity(tasksInPool);
    if (taskDefinition && taskDefinition.maxConcurrency) {
      // calculate the max capacity that can be used for this task type based on cost
      const maxCapacityForType = taskDefinition.maxConcurrency * taskDefinition.cost;
      return Math.max(
        Math.min(
          allAvailableCapacity,
          maxCapacityForType -
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

    let capacityAccumulator = 0;
    for (const task of tasks) {
      const taskCost = task.definition.cost;
      if (capacityAccumulator + taskCost <= availableCapacity) {
        tasksToRun.push(task);
        capacityAccumulator += taskCost;
      } else {
        leftOverTasks.push(task);
        // Don't claim further tasks even if lower cost tasks are next.
        // It may be an extra large task and we need to make room for it
        // for the next claiming cycle
        capacityAccumulator = availableCapacity;
      }
    }

    return [tasksToRun, leftOverTasks];
  }
}
