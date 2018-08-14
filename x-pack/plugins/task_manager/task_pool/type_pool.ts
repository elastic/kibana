/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from './logger';
import { ConcreteTaskInstance, ElasticJs, TaskDefinition } from './task';
import { TaskRunner } from './task_runner';
import { TaskStore } from './task_store';

interface Opts {
  definition: TaskDefinition;
  logger: Logger;
  store: TaskStore;
}

export class TypePool {
  public definition: TaskDefinition;
  private running = new Set<TaskRunner>();
  private cancelling = new Set<TaskRunner>();
  private maxConcurrency: number;
  private logger: Logger;
  private store: TaskStore;

  constructor(opts: Opts) {
    this.definition = opts.definition;
    this.maxConcurrency = opts.definition.maxConcurrency;
    this.logger = opts.logger;
    this.store = opts.store;
  }

  get availableSlots() {
    return this.maxConcurrency - this.running.size;
  }

  get occupiedSlots() {
    return this.running.size;
  }

  get isFull() {
    return this.availableSlots <= 0;
  }

  public async run(callCluster: ElasticJs, instance: ConcreteTaskInstance, onComplete: () => void) {
    if (this.isFull) {
      return;
    }

    const task = new TaskRunner({
      instance,
      callCluster,
      definition: this.definition,
      logger: this.logger,
      store: this.store,
    });

    if (await task.claimOwnership()) {
      this.running.add(task);
      task.run().then(() => {
        this.running.delete(task);
        onComplete();
      });
    }
  }

  public checkForExpiredTasks() {
    for (const task of this.running) {
      if (task.isTimedOut) {
        this.cancelling.add(task);
        this.running.delete(task);
        task
          .cancel()
          .catch(error => this.logger.warning(`Failed to cancel task ${task}. ${error.stack}`))
          .then(() => this.cancelling.delete(task));
      }
    }
  }
}
