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
import { TaskCost } from '../task';

/**
 * Runs tasks in batches, taking task costs into account.
 */
export class CapacityByWorker implements ICapacityCalculator {
  private workers: number = 0;
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
      // Assign a max worker value based on the capacity and the cost of a normal task
      // For the default starting capacity of 20, this will mean we have 10 workers
      this.workers = capacity / TaskCost.Normal;
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

  public determineTasksToRunBasedOnCapacity(
    tasks: TaskRunner[],
    availableCapacity: number
  ): [TaskRunner[], TaskRunner[]] {
    const tasksInCount = tasks.splice(0, availableCapacity);
    return [tasksInCount, tasks];
  }
}
