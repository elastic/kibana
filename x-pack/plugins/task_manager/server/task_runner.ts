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

import apm from 'elastic-apm-node';
import { performance } from 'perf_hooks';
import Joi from 'joi';
import { identity, defaults, flow } from 'lodash';

import { asOk, asErr, mapErr, eitherAsync, unwrap, mapOk, Result } from './lib/result_type';
import { TaskRun, TaskMarkRunning, asTaskRunEvent, asTaskMarkRunningEvent } from './task_events';
import { intervalFromDate, intervalFromNow } from './lib/intervals';
import { Logger } from './types';
import { BeforeRunFunction, BeforeMarkRunningFunction } from './lib/middleware';
import {
  CancelFunction,
  CancellableTask,
  ConcreteTaskInstance,
  RunResult,
  SuccessfulRunResult,
  FailedRunResult,
  FailedTaskResult,
  TaskDefinition,
  TaskDictionary,
  validateRunResult,
  TaskStatus,
} from './task';

const defaultBackoffPerFailure = 5 * 60 * 1000;
const EMPTY_RUN_RESULT: SuccessfulRunResult = {};

export interface TaskRunner {
  isExpired: boolean;
  cancel: CancelFunction;
  markTaskAsRunning: () => Promise<boolean>;
  run: () => Promise<Result<SuccessfulRunResult, FailedRunResult>>;
  id: string;
  toString: () => string;
}

interface Updatable {
  readonly maxAttempts: number;
  update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance>;
  remove(id: string): Promise<void>;
}

interface Opts {
  logger: Logger;
  definitions: TaskDictionary<TaskDefinition>;
  instance: ConcreteTaskInstance;
  store: Updatable;
  beforeRun: BeforeRunFunction;
  beforeMarkRunning: BeforeMarkRunningFunction;
  onTaskEvent?: (event: TaskRun | TaskMarkRunning) => void;
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
  private definitions: TaskDictionary<TaskDefinition>;
  private logger: Logger;
  private bufferedTaskStore: Updatable;
  private beforeRun: BeforeRunFunction;
  private beforeMarkRunning: BeforeMarkRunningFunction;
  private onTaskEvent: (event: TaskRun | TaskMarkRunning) => void;

  /**
   * Creates an instance of TaskManagerRunner.
   * @param {Opts} opts
   * @prop {Logger} logger - The task manager logger
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {ConcreteTaskInstance} instance - The record describing this particular task instance
   * @prop {Updatable} store - The store used to read / write tasks instance info
   * @prop {BeforeRunFunction} beforeRun - A function that adjusts the run context prior to running the task
   * @memberof TaskManagerRunner
   */
  constructor({
    instance,
    definitions,
    logger,
    store,
    beforeRun,
    beforeMarkRunning,
    onTaskEvent = identity,
  }: Opts) {
    this.instance = sanitizeInstance(instance);
    this.definitions = definitions;
    this.logger = logger;
    this.bufferedTaskStore = store;
    this.beforeRun = beforeRun;
    this.beforeMarkRunning = beforeMarkRunning;
    this.onTaskEvent = onTaskEvent;
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
   * Gets the task defintion from the dictionary.
   */
  public get definition() {
    return this.definitions[this.taskType];
  }

  /**
   * Gets whether or not this task has run longer than its expiration setting allows.
   */
  public get isExpired() {
    return intervalFromDate(this.instance.startedAt!, this.definition.timeout)! < new Date();
  }

  /**
   * Returns a log-friendly representation of this task.
   */
  public toString() {
    return `${this.taskType} "${this.id}"`;
  }

  /**
   * Runs the task, handling the task result, errors, etc, rescheduling if need
   * be. NOTE: the time of applying the middleware's beforeRun is incorporated
   * into the total timeout time the task in configured with. We may decide to
   * start the timer after beforeRun resolves
   *
   * @returns {Promise<Result<SuccessfulRunResult, FailedRunResult>>}
   */
  public async run(): Promise<Result<SuccessfulRunResult, FailedRunResult>> {
    this.logger.debug(`Running task ${this}`);
    const modifiedContext = await this.beforeRun({
      taskInstance: this.instance,
    });

    const apmTrans = apm.startTransaction(
      `taskManager run ${this.instance.taskType}`,
      'taskManager'
    );
    try {
      this.task = this.definition.createTaskRunner(modifiedContext);
      const result = await this.task.run();
      const validatedResult = this.validateResult(result);
      if (apmTrans) apmTrans.end('success');
      return this.processResult(validatedResult);
    } catch (err) {
      this.logger.error(`Task ${this} failed: ${err}`);
      // in error scenario, we can not get the RunResult
      // re-use modifiedContext's state, which is correct as of beforeRun
      if (apmTrans) apmTrans.end('error');
      return this.processResult(asErr({ error: err, state: modifiedContext.taskInstance.state }));
    }
  }

  /**
   * Attempts to claim exclusive rights to run the task. If the attempt fails
   * with a 409 (http conflict), we assume another Kibana instance beat us to the punch.
   *
   * @returns {Promise<boolean>}
   */
  public async markTaskAsRunning(): Promise<boolean> {
    performance.mark('markTaskAsRunning_start');

    const apmTrans = apm.startTransaction(
      `taskManager markTaskAsRunning ${this.instance.taskType}`,
      'taskManager'
    );

    const VERSION_CONFLICT_STATUS = 409;
    const now = new Date();

    const { taskInstance } = await this.beforeMarkRunning({
      taskInstance: this.instance,
    });

    const attempts = taskInstance.attempts + 1;
    const ownershipClaimedUntil = taskInstance.retryAt;

    try {
      const { id } = taskInstance;

      const timeUntilClaimExpires = howManyMsUntilOwnershipClaimExpires(ownershipClaimedUntil);
      if (timeUntilClaimExpires < 0) {
        this.logger.debug(
          `[Task Runner] Task ${id} started after ownership expired (${Math.abs(
            timeUntilClaimExpires
          )}ms after expiry)`
        );
      }

      this.instance = await this.bufferedTaskStore.update({
        ...taskInstance,
        status: TaskStatus.Running,
        startedAt: now,
        attempts,
        retryAt: this.instance.schedule
          ? intervalFromNow(this.definition.timeout)!
          : this.getRetryDelay({
              attempts,
              // Fake an error. This allows retry logic when tasks keep timing out
              // and lets us set a proper "retryAt" value each time.
              error: new Error('Task timeout'),
              addDuration: this.definition.timeout,
            }),
      });

      const timeUntilClaimExpiresAfterUpdate = howManyMsUntilOwnershipClaimExpires(
        ownershipClaimedUntil
      );
      if (timeUntilClaimExpiresAfterUpdate < 0) {
        this.logger.debug(
          `[Task Runner] Task ${id} ran after ownership expired (${Math.abs(
            timeUntilClaimExpiresAfterUpdate
          )}ms after expiry)`
        );
      }

      if (apmTrans) apmTrans.end('success');
      performanceStopMarkingTaskAsRunning();
      this.onTaskEvent(asTaskMarkRunningEvent(this.id, asOk(this.instance)));
      return true;
    } catch (error) {
      if (apmTrans) apmTrans.end('failure');
      performanceStopMarkingTaskAsRunning();
      this.onTaskEvent(asTaskMarkRunningEvent(this.id, asErr(error)));
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

    this.logger.warn(`The task ${this} is not cancellable.`);
  }

  private validateResult(result?: RunResult | void): Result<SuccessfulRunResult, FailedRunResult> {
    const { error } = Joi.validate(result, validateRunResult);

    if (error) {
      this.logger.warn(`Invalid task result for ${this}: ${error.message}`);
      return asErr({
        error: new Error(`Invalid task result for ${this}: ${error.message}`),
        state: {},
      });
    }
    if (!result) {
      return asOk(EMPTY_RUN_RESULT);
    }

    return result.error ? asErr({ ...result, error: result.error as Error }) : asOk(result);
  }

  private shouldTryToScheduleRetry(): boolean {
    if (this.instance.schedule) {
      return true;
    }

    const maxAttempts = this.definition.maxAttempts || this.bufferedTaskStore.maxAttempts;
    return this.instance.attempts < maxAttempts;
  }

  private rescheduleFailedRun = (
    failureResult: FailedRunResult
  ): Result<SuccessfulRunResult, FailedTaskResult> => {
    if (this.shouldTryToScheduleRetry()) {
      const { runAt, state, error } = failureResult;
      // if we're retrying, keep the number of attempts
      const { schedule, attempts } = this.instance;
      if (runAt || schedule) {
        return asOk({ state, attempts, runAt });
      } else {
        // when result.error is truthy, then we're retrying because it failed
        const newRunAt = this.getRetryDelay({
          attempts,
          error,
        });

        if (newRunAt) {
          return asOk({ state, attempts, runAt: newRunAt });
        }
      }
    }
    // scheduling a retry isn't possible,mark task as failed
    return asErr({ status: TaskStatus.Failed });
  };

  private async processResultForRecurringTask(
    result: Result<SuccessfulRunResult, FailedRunResult>
  ): Promise<void> {
    const fieldUpdates = flow(
      // if running the task has failed ,try to correct by scheduling a retry in the near future
      mapErr(this.rescheduleFailedRun),
      // if retrying is possible (new runAt) or this is an recurring task - reschedule
      mapOk(({ runAt, state, attempts = 0 }: Partial<ConcreteTaskInstance>) => {
        const { startedAt, schedule: { interval = undefined } = {} } = this.instance;
        return asOk({
          runAt: runAt || intervalFromDate(startedAt!, interval)!,
          state,
          attempts,
          status: TaskStatus.Idle,
        });
      }),
      unwrap
    )(result);

    await this.bufferedTaskStore.update(
      defaults(
        {
          ...fieldUpdates,
          // reset fields that track the lifecycle of the concluded `task run`
          startedAt: null,
          retryAt: null,
          ownerId: null,
        },
        this.instance
      )
    );
  }

  private async processResultWhenDone(): Promise<void> {
    // not a recurring task: clean up by removing the task instance from store
    try {
      await this.bufferedTaskStore.remove(this.instance.id);
    } catch (err) {
      if (err.statusCode === 404) {
        this.logger.warn(`Task cleanup of ${this} failed in processing. Was remove called twice?`);
      } else {
        throw err;
      }
    }
  }

  private async processResult(
    result: Result<SuccessfulRunResult, FailedRunResult>
  ): Promise<Result<SuccessfulRunResult, FailedRunResult>> {
    await eitherAsync(
      result,
      async ({ runAt }: SuccessfulRunResult) => {
        if (runAt || this.instance.schedule) {
          await this.processResultForRecurringTask(result);
        } else {
          await this.processResultWhenDone();
        }
        this.onTaskEvent(asTaskRunEvent(this.id, asOk(this.instance)));
      },
      async ({ error }: FailedRunResult) => {
        await this.processResultForRecurringTask(result);
        this.onTaskEvent(asTaskRunEvent(this.id, asErr(error)));
      }
    );
    return result;
  }

  private getRetryDelay({
    error,
    attempts,
    addDuration,
  }: {
    error: any;
    attempts: number;
    addDuration?: string;
  }): Date | null {
    let result = null;

    // Use custom retry logic, if any, otherwise we'll use the default logic
    const retry: boolean | Date = this.definition.getRetry
      ? this.definition.getRetry(attempts, error)
      : true;

    if (retry instanceof Date) {
      result = retry;
    } else if (retry === true) {
      result = new Date(Date.now() + attempts * defaultBackoffPerFailure);
    }

    // Add a duration to the result
    if (addDuration && result) {
      result = intervalFromDate(result, addDuration)!;
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

function howManyMsUntilOwnershipClaimExpires(ownershipClaimedUntil: Date | null): number {
  return ownershipClaimedUntil ? ownershipClaimedUntil.getTime() - Date.now() : 0;
}

function performanceStopMarkingTaskAsRunning() {
  performance.mark('markTaskAsRunning_stop');
  performance.measure(
    'taskRunner.markTaskAsRunning',
    'markTaskAsRunning_start',
    'markTaskAsRunning_stop'
  );
}
