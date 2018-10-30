/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains the core logic for running an individual task.
 * It handles the full lifecycle of a task run, including error handling,
 * rescheduling, middleware application, etc.
 */

import Joi from 'joi';
import { intervalFromNow, minutesFromNow } from './lib/intervals';
import { Logger } from './lib/logger';
import { BeforeRunFunction } from './lib/middleware';
import {
  CancelFunction,
  CancellableTask,
  ConcreteTaskInstance,
  RunResult,
  TaskDefinition,
  validateRunResult,
} from './task';
import { RemoveResult } from './task_store';

export interface TaskRunner {
  numWorkers: number;
  isExpired: boolean;
  cancel: CancelFunction;
  claimOwnership: () => Promise<boolean>;
  run: () => Promise<RunResult>;
  toString?: () => string;
}

interface Updatable {
  update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance>;
  remove(id: string): Promise<RemoveResult>;
  getMaxAttempts(): number;
}

interface Opts {
  logger: Logger;
  definition: TaskDefinition;
  instance: ConcreteTaskInstance;
  store: Updatable;
  kbnServer: any;
  beforeRun: BeforeRunFunction;
}

/**
 * Runs a background task, ensures that errors are properly handled,
 * allows for cancellation.
 *
 * @export
 * @class TaskManagerRunner
 * @implements {TaskRunner}
 */
export class TaskManagerRunner implements TaskRunner {
  private task?: CancellableTask;
  private instance: ConcreteTaskInstance;
  private definition: TaskDefinition;
  private logger: Logger;
  private store: Updatable;
  private kbnServer: any;
  private beforeRun: BeforeRunFunction;

  /**
   * Creates an instance of TaskManagerRunner.
   * @param {Opts} opts
   * @prop {Logger} logger - The task manager logger
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {ConcreteTaskInstance} instance - The record describing this particular task instance
   * @prop {Updatable} store - The store used to read / write tasks instance info
   * @prop {kbnServer} kbnServer - An async function that provides the task's run context
   * @prop {BeforeRunFunction} beforeRun - A function that adjusts the run context prior to running the task
   * @memberof TaskManagerRunner
   */
  constructor(opts: Opts) {
    this.instance = sanitizeInstance(opts.instance);
    this.definition = opts.definition;
    this.logger = opts.logger;
    this.store = opts.store;
    this.kbnServer = opts.kbnServer;
    this.beforeRun = opts.beforeRun;
  }

  /**
   * Gets how many workers are occupied by this task instance.
   */
  public get numWorkers() {
    return this.definition.numWorkers || 1;
  }

  /**
   * Gets the id of this task instance.
   */
  public get id() {
    return this.instance.id;
  }

  /**
   * Gets the task type of this task instance.
   */
  public get taskType() {
    return this.instance.taskType;
  }

  /**
   * Gets whether or not this task has run longer than its expiration setting allows.
   */
  public get isExpired() {
    return this.instance.runAt < new Date();
  }

  /**
   * Returns a log-friendly representation of this task.
   */
  public toString() {
    return `${this.instance.taskType} "${this.instance.id}"`;
  }

  /**
   * Runs the task, handling the task result, errors, etc, rescheduling if need
   * be. NOTE: the time of applying the middleware's beforeRun is incorporated
   * into the total timeout time the task in configured with. We may decide to
   * start the timer after beforeRun resolves
   *
   * @returns {Promise<RunResult>}
   */
  public async run(): Promise<RunResult> {
    try {
      this.logger.debug(`Running task ${this}`);
      const modifiedContext = await this.beforeRun({
        kbnServer: this.kbnServer,
        taskInstance: this.instance,
      });
      const task = this.definition.createTaskRunner(modifiedContext);
      this.task = task;
      return this.processResult(this.validateResult(await this.task.run()));
    } catch (error) {
      this.logger.warning(`Task ${this} failed ${error.stack}`);
      this.logger.debug(`Task ${JSON.stringify(this.instance)} failed ${error.stack}`);

      return this.processResult({ error });
    }
  }

  /**
   * Attempts to claim exclusive rights to run the task. If the attempt fails
   * with a 409 (http conflict), we assume another Kibana instance beat us to the punch.
   *
   * @returns {Promise<boolean>}
   */
  public async claimOwnership(): Promise<boolean> {
    const VERSION_CONFLICT_STATUS = 409;

    try {
      this.instance = await this.store.update({
        ...this.instance,
        status: 'running',
        runAt: intervalFromNow(this.definition.timeOut)!,
      });

      return true;
    } catch (error) {
      if (error.statusCode !== VERSION_CONFLICT_STATUS) {
        throw error;
      }
    }

    return false;
  }

  /**
   * Attempts to cancel the task.
   *
   * @returns {Promise<void>}
   */
  public async cancel() {
    const { task } = this;
    if (task && task.cancel) {
      this.task = undefined;
      return task.cancel();
    }

    this.logger.warning(`The task ${this} is not cancellable.`);
  }

  private validateResult(result?: RunResult | void): RunResult {
    const { error } = Joi.validate(result, validateRunResult);

    if (error) {
      this.logger.warning(`Invalid task result for ${this}: ${error.message}`);
    }

    return result || {};
  }

  private async processResult(result: RunResult): Promise<RunResult> {
    const recurring = result.runAt || this.instance.interval || result.error;
    if (recurring) {
      // recurring task: update the task instance
      const state = result.state || this.instance.state || {};
      const status = this.instance.attempts < this.store.getMaxAttempts() ? 'idle' : 'failed';

      let runAt;
      if (result.error) {
        // task run errored, keep the same runAt
        runAt = this.instance.runAt;
      } else {
        runAt =
          result.runAt ||
          intervalFromNow(this.instance.interval) ||
          minutesFromNow((this.instance.attempts + 1) * 5);
      }

      await this.store.update({
        ...this.instance,
        runAt,
        state,
        status,
        attempts: result.error ? this.instance.attempts + 1 : 0,
      });
    } else {
      // not a recurring task: clean up by removing the task instance from store
      try {
        await this.store.remove(this.instance.id);
      } catch (err) {
        if (err.statusCode === 404) {
          this.logger.warning(
            `Task cleanup of ${this} failed in processing. Was remove called twice?`
          );
        } else {
          throw err;
        }
      }
    }

    return result;
  }
}

function sanitizeInstance(instance: ConcreteTaskInstance): ConcreteTaskInstance {
  return {
    ...instance,
    params: instance.params || {},
    state: instance.state || {},
  };
}
