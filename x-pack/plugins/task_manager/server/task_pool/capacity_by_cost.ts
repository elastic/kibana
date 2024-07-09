/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains the logic that ensures we don't run too many
 * tasks at once in a given Kibana instance.
 */
import { Logger } from '@kbn/core/server';
import { TaskRunner } from '../task_running';
import { CapacityCalculatorOpts, ICapacityCalculator } from './types';

/**
 * Runs tasks in batches, taking task costs into account.
 */
export class CapacityByCost implements ICapacityCalculator {
  private _capacity: number = 0;
  private logger: Logger;

  /**
   * Creates an instance of TaskPool.
   *
   * @param {Opts} opts
   * @prop {number} capacity - The total capacity available
   *    (e.g. capacity is 4, then 2 tasks of cost 2 can run at a time, or 4 tasks of cost 1)
   * @prop {Logger} logger - The task manager logger.
   */
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
