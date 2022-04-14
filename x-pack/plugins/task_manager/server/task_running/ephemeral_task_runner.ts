/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains the core logic for running an individual task.
 * It handles the full lifecycle of a task run, including error handling,
 * rescheduling, middleware application, etc.
 */

import apm from 'elastic-apm-node';
import uuid from 'uuid';
import { withSpan } from '@kbn/apm-utils';
import { identity } from 'lodash';
import { Logger, ExecutionContextStart } from '../../../../../src/core/server';

import { Middleware } from '../lib/middleware';
import { asOk, asErr, eitherAsync, Result } from '../lib/result_type';
import {
  TaskRun,
  TaskMarkRunning,
  asTaskRunEvent,
  asTaskMarkRunningEvent,
  startTaskTimer,
  TaskTiming,
  TaskPersistence,
} from '../task_events';
import { intervalFromDate } from '../lib/intervals';
import {
  CancellableTask,
  ConcreteTaskInstance,
  isFailedRunResult,
  SuccessfulRunResult,
  FailedRunResult,
  TaskStatus,
  EphemeralTaskInstance,
} from '../task';
import { TaskTypeDictionary } from '../task_type_dictionary';
import {
  asPending,
  asReadyToRun,
  EMPTY_RUN_RESULT,
  isPending,
  isReadyToRun,
  TaskRunner,
  TaskRunningInstance,
  TaskRunResult,
  TASK_MANAGER_RUN_TRANSACTION_TYPE,
  TASK_MANAGER_TRANSACTION_TYPE,
  TASK_MANAGER_TRANSACTION_TYPE_MARK_AS_RUNNING,
} from './task_runner';

type Opts = {
  logger: Logger;
  definitions: TaskTypeDictionary;
  instance: EphemeralTaskInstance;
  onTaskEvent?: (event: TaskRun | TaskMarkRunning) => void;
  executionContext: ExecutionContextStart;
} & Pick<Middleware, 'beforeRun' | 'beforeMarkRunning' | 'afterRun'>;

// ephemeral tasks cannot be rescheduled or scheduled to run again in the future
type EphemeralSuccessfulRunResult = Omit<SuccessfulRunResult, 'runAt' | 'schedule'>;
type EphemeralFailedRunResult = Omit<FailedRunResult, 'runAt' | 'schedule'>;

/**
 *
 * @export
 * @class EphemeralTaskManagerRunner
 * @implements {TaskRunner}
 */
export class EphemeralTaskManagerRunner implements TaskRunner {
  private task?: CancellableTask;
  private instance: TaskRunningInstance;
  private definitions: TaskTypeDictionary;
  private logger: Logger;
  private beforeRun: Middleware['beforeRun'];
  private beforeMarkRunning: Middleware['beforeMarkRunning'];
  private afterRun: Middleware['afterRun'];
  private onTaskEvent: (event: TaskRun | TaskMarkRunning) => void;
  private uuid: string;
  private readonly executionContext: ExecutionContextStart;

  /**
   * Creates an instance of EphemeralTaskManagerRunner.
   * @param {Opts} opts
   * @prop {Logger} logger - The task manager logger
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {EphemeralTaskInstance} instance - The record describing this particular task instance
   * @prop {BeforeRunFunction} beforeRun - A function that adjusts the run context prior to running the task
   * @memberof TaskManagerRunner
   */
  constructor({
    instance,
    definitions,
    logger,
    beforeRun,
    afterRun,
    beforeMarkRunning,
    onTaskEvent = identity,
    executionContext,
  }: Opts) {
    this.instance = asPending(asConcreteInstance(sanitizeInstance(instance)));
    this.definitions = definitions;
    this.logger = logger;
    this.beforeRun = beforeRun;
    this.beforeMarkRunning = beforeMarkRunning;
    this.afterRun = afterRun;
    this.onTaskEvent = onTaskEvent;
    this.executionContext = executionContext;
    this.uuid = uuid.v4();
  }

  /**
   * Gets the id of this task instance.
   */
  public get id() {
    return this.instance.task.id;
  }

  /**
   * Gets the exeuction id of this task instance.
   */
  public get taskExecutionId() {
    return `${this.id}::${this.uuid}`;
  }

  /**
   * Test whether given execution ID identifies a different execution of this same task
   * @param id
   */
  public isSameTask(executionId: string) {
    return executionId.startsWith(this.id);
  }

  /**
   * Gets the task type of this task instance.
   */
  public get taskType() {
    return this.instance.task.taskType;
  }

  /**
   * Get the stage this TaskRunner is at
   */
  public get stage() {
    return this.instance.stage;
  }

  /**
   * Gets the task defintion from the dictionary.
   */
  public get definition() {
    return this.definitions.get(this.taskType);
  }

  /**
   * Gets the time at which this task will expire.
   */
  public get expiration() {
    return intervalFromDate(
      // if the task is running, use it's started at, otherwise use the timestamp at
      // which it was last updated
      // this allows us to catch tasks that remain in Pending/Finalizing without being
      // cleaned up
      isReadyToRun(this.instance) ? this.instance.task.startedAt : this.instance.timestamp,
      this.definition.timeout
    )!;
  }

  /**
   * Gets the duration of the current task run
   */
  public get startedAt() {
    return this.instance.task.startedAt;
  }

  /**
   * Gets whether or not this task has run longer than its expiration setting allows.
   */
  public get isExpired() {
    return this.expiration < new Date();
  }

  public get isEphemeral() {
    return true;
  }

  /**
   * Returns a log-friendly representation of this task.
   */
  public toString() {
    return `${this.taskType} "${this.id}" (Ephemeral)`;
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
    if (!isReadyToRun(this.instance)) {
      throw new Error(
        `Running ephemeral task ${this} failed as it ${
          isPending(this.instance) ? `isn't ready to be ran` : `has already been ran`
        }`
      );
    }
    this.logger.debug(`Running ephemeral task ${this}`);
    const apmTrans = apm.startTransaction(this.taskType, TASK_MANAGER_RUN_TRANSACTION_TYPE, {
      childOf: this.instance.task.traceparent,
    });
    apmTrans?.addLabels({ ephemeral: true });

    const modifiedContext = await this.beforeRun({
      taskInstance: asConcreteInstance(this.instance.task),
    });
    const stopTaskTimer = startTaskTimer();
    try {
      this.task = this.definition.createTaskRunner(modifiedContext);
      const ctx = {
        type: 'task manager',
        name: `run ephemeral ${this.instance.task.taskType}`,
        id: this.instance.task.id,
        description: 'run ephemeral task',
      };
      const result = await this.executionContext.withContext(ctx, () =>
        withSpan({ name: 'ephemeral run', type: 'task manager' }, () => this.task!.run())
      );
      const validatedResult = this.validateResult(result);
      const processedResult = await withSpan(
        { name: 'process ephemeral result', type: 'task manager' },
        () => this.processResult(validatedResult, stopTaskTimer())
      );
      this.afterRun({ context: modifiedContext, result: processedResult });
      if (apmTrans) apmTrans.end('success');
      return processedResult;
    } catch (err) {
      this.logger.error(`Task ${this} failed: ${err}`);
      // in error scenario, we can not get the RunResult
      const processedResult = await withSpan(
        { name: 'process ephemeral result', type: 'task manager' },
        () =>
          this.processResult(
            asErr({ error: err, state: modifiedContext.taskInstance.state }),
            stopTaskTimer()
          )
      );
      this.afterRun({ context: modifiedContext, result: processedResult });
      if (apmTrans) apmTrans.end('failure');
      return processedResult;
    }
  }

  /**
   * Noop for Ephemeral tasks
   *
   * @returns {Promise<boolean>}
   */
  public async markTaskAsRunning(): Promise<boolean> {
    if (!isPending(this.instance)) {
      throw new Error(
        `Marking ephemeral task ${this} as running has failed as it ${
          isReadyToRun(this.instance) ? `is already running` : `has already been ran`
        }`
      );
    }

    const apmTrans = apm.startTransaction(
      TASK_MANAGER_TRANSACTION_TYPE_MARK_AS_RUNNING,
      TASK_MANAGER_TRANSACTION_TYPE
    );
    apmTrans?.addLabels({ entityId: this.taskType });

    const now = new Date();
    try {
      const { taskInstance } = await this.beforeMarkRunning({
        taskInstance: asConcreteInstance(this.instance.task),
      });

      this.instance = asReadyToRun({
        ...taskInstance,
        status: TaskStatus.Running,
        startedAt: now,
        attempts: taskInstance.attempts + 1,
        retryAt: null,
      });

      if (apmTrans) apmTrans.end('success');
      this.onTaskEvent(asTaskMarkRunningEvent(this.id, asOk(this.instance.task)));
      return true;
    } catch (error) {
      if (apmTrans) apmTrans.end('failure');
      this.onTaskEvent(asTaskMarkRunningEvent(this.id, asErr(error)));
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
    if (task?.cancel) {
      // it will cause the task state of "running" to be cleared
      this.task = undefined;
      return task.cancel();
    }

    this.logger.debug(`The ephemral task ${this} is not cancellable.`);
  }

  private validateResult(
    result?: SuccessfulRunResult | FailedRunResult | void
  ): Result<EphemeralSuccessfulRunResult, EphemeralFailedRunResult> {
    return isFailedRunResult(result)
      ? asErr({ ...result, error: result.error })
      : asOk(result || EMPTY_RUN_RESULT);
  }

  private async processResult(
    result: Result<EphemeralSuccessfulRunResult, EphemeralFailedRunResult>,
    taskTiming: TaskTiming
  ): Promise<Result<SuccessfulRunResult, FailedRunResult>> {
    await eitherAsync(
      result,
      async ({ state }: EphemeralSuccessfulRunResult) => {
        this.onTaskEvent(
          asTaskRunEvent(
            this.id,
            asOk({
              task: { ...this.instance.task, state },
              persistence: TaskPersistence.Ephemeral,
              result: TaskRunResult.Success,
            }),
            taskTiming
          )
        );
      },
      async ({ error, state }: EphemeralFailedRunResult) => {
        this.onTaskEvent(
          asTaskRunEvent(
            this.id,
            asErr({
              task: { ...this.instance.task, state },
              persistence: TaskPersistence.Ephemeral,
              result: TaskRunResult.Failed,
              error,
            }),
            taskTiming
          )
        );
      }
    );
    return result;
  }
}

function sanitizeInstance(instance: EphemeralTaskInstance): EphemeralTaskInstance {
  return {
    ...instance,
    params: instance.params || {},
    state: instance.state || {},
  };
}

function asConcreteInstance(instance: EphemeralTaskInstance): ConcreteTaskInstance {
  return {
    ...instance,
    attempts: 0,
    retryAt: null,
  };
}
