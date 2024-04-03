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
import { v4 as uuidv4 } from 'uuid';
import { withSpan } from '@kbn/apm-utils';
import { defaults, flow, identity, omit, random } from 'lodash';
import { ExecutionContextStart, Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { Middleware } from '../lib/middleware';
import {
  asErr,
  asOk,
  eitherAsync,
  isOk,
  mapErr,
  mapOk,
  promiseResult,
  Result,
  unwrap,
} from '../lib/result_type';
import {
  asTaskMarkRunningEvent,
  asTaskRunEvent,
  asTaskManagerStatEvent,
  startTaskTimerWithEventLoopMonitoring,
  TaskMarkRunning,
  TaskPersistence,
  TaskRun,
  TaskTiming,
  TaskManagerStat,
} from '../task_events';
import { intervalFromDate, maxIntervalFromDate } from '../lib/intervals';
import {
  CancelFunction,
  CancellableTask,
  ConcreteTaskInstance,
  FailedRunResult,
  FailedTaskResult,
  isFailedRunResult,
  SuccessfulRunResult,
  TaskDefinition,
  TaskStatus,
} from '../task';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { isRetryableError, isUnrecoverableError } from './errors';
import type { EventLoopDelayConfig } from '../config';
import { TaskValidator } from '../task_validator';

export const EMPTY_RUN_RESULT: SuccessfulRunResult = { state: {} };

export const TASK_MANAGER_RUN_TRANSACTION_TYPE = 'task-run';
export const TASK_MANAGER_TRANSACTION_TYPE = 'task-manager';
export const TASK_MANAGER_TRANSACTION_TYPE_MARK_AS_RUNNING = 'mark-task-as-running';

export interface TaskRunner {
  isExpired: boolean;
  expiration: Date;
  startedAt: Date | null;
  definition: TaskDefinition;
  cancel: CancelFunction;
  markTaskAsRunning: () => Promise<boolean>;
  run: () => Promise<Result<SuccessfulRunResult, FailedRunResult>>;
  id: string;
  taskExecutionId: string;
  stage: string;
  isEphemeral?: boolean;
  toString: () => string;
  isSameTask: (executionId: string) => boolean;
  isAdHocTaskAndOutOfAttempts: boolean;
  removeTask: () => Promise<void>;
}

export enum TaskRunningStage {
  PENDING = 'PENDING',
  READY_TO_RUN = 'READY_TO_RUN',
  RAN = 'RAN',
}
export interface TaskRunning<Stage extends TaskRunningStage, Instance> {
  timestamp: Date;
  stage: Stage;
  task: Instance;
}

export interface Updatable {
  update(doc: ConcreteTaskInstance, options: { validate: boolean }): Promise<ConcreteTaskInstance>;
  remove(id: string): Promise<void>;
}

type Opts = {
  logger: Logger;
  definitions: TaskTypeDictionary;
  instance: ConcreteTaskInstance;
  store: Updatable;
  onTaskEvent?: (event: TaskRun | TaskMarkRunning | TaskManagerStat) => void;
  defaultMaxAttempts: number;
  executionContext: ExecutionContextStart;
  usageCounter?: UsageCounter;
  eventLoopDelayConfig: EventLoopDelayConfig;
  allowReadingInvalidState: boolean;
} & Pick<Middleware, 'beforeRun' | 'beforeMarkRunning'>;

export enum TaskRunResult {
  // Task completed successfully
  Success = 'Success',
  // Recurring Task completed successfully
  SuccessRescheduled = 'Success',
  // Task has failed and a retry has been scheduled
  RetryScheduled = 'RetryScheduled',
  // Task has failed
  Failed = 'Failed',
}

// A ConcreteTaskInstance which we *know* has a `startedAt` Date on it
export type ConcreteTaskInstanceWithStartedAt = ConcreteTaskInstance & { startedAt: Date };

// The three possible stages for a Task Runner - Pending -> ReadyToRun -> Ran
export type PendingTask = TaskRunning<TaskRunningStage.PENDING, ConcreteTaskInstance>;
export type ReadyToRunTask = TaskRunning<
  TaskRunningStage.READY_TO_RUN,
  ConcreteTaskInstanceWithStartedAt
>;
export type RanTask = TaskRunning<TaskRunningStage.RAN, ConcreteTaskInstance>;

export type TaskRunningInstance = PendingTask | ReadyToRunTask | RanTask;

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
  private instance: TaskRunningInstance;
  private definitions: TaskTypeDictionary;
  private logger: Logger;
  private bufferedTaskStore: Updatable;
  private beforeRun: Middleware['beforeRun'];
  private beforeMarkRunning: Middleware['beforeMarkRunning'];
  private onTaskEvent: (event: TaskRun | TaskMarkRunning | TaskManagerStat) => void;
  private defaultMaxAttempts: number;
  private uuid: string;
  private readonly executionContext: ExecutionContextStart;
  private usageCounter?: UsageCounter;
  private eventLoopDelayConfig: EventLoopDelayConfig;
  private readonly taskValidator: TaskValidator;

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
    defaultMaxAttempts,
    onTaskEvent = identity,
    executionContext,
    usageCounter,
    eventLoopDelayConfig,
    allowReadingInvalidState,
  }: Opts) {
    this.instance = asPending(sanitizeInstance(instance));
    this.definitions = definitions;
    this.logger = logger;
    this.bufferedTaskStore = store;
    this.beforeRun = beforeRun;
    this.beforeMarkRunning = beforeMarkRunning;
    this.onTaskEvent = onTaskEvent;
    this.defaultMaxAttempts = defaultMaxAttempts;
    this.executionContext = executionContext;
    this.usageCounter = usageCounter;
    this.uuid = uuidv4();
    this.eventLoopDelayConfig = eventLoopDelayConfig;
    this.taskValidator = new TaskValidator({
      logger: this.logger,
      definitions: this.definitions,
      allowReadingInvalidState,
    });
  }

  /**
   * Gets the id of this task instance.
   */
  public get id() {
    return this.instance.task.id;
  }

  /**
   * Gets the execution id of this task instance.
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
      this.timeout
    )!;
  }

  /*
   * Gets the timeout of the current task. Uses the timeout
   * defined by the task type unless this is an ad-hoc task that specifies an override
   */
  public get timeout() {
    if (this.instance.task.schedule) {
      // recurring tasks should use timeout in task type
      return this.definition.timeout;
    }

    return this.instance.task.timeoutOverride
      ? this.instance.task.timeoutOverride
      : this.definition.timeout;
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

  /**
   * Returns true whenever the task is ad hoc and has ran out of attempts. When true before
   * running a task, the task should be deleted instead of ran.
   */
  public get isAdHocTaskAndOutOfAttempts() {
    return !this.instance.task.schedule && this.instance.task.attempts >= this.getMaxAttempts();
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
    if (!isReadyToRun(this.instance)) {
      throw new Error(
        `Running task ${this} failed as it ${
          isPending(this.instance) ? `isn't ready to be ran` : `has already been ran`
        }`
      );
    }
    this.logger.debug(`Running task ${this}`, { tags: ['task:start', this.id, this.taskType] });

    const apmTrans = apm.startTransaction(this.taskType, TASK_MANAGER_RUN_TRANSACTION_TYPE, {
      childOf: this.instance.task.traceparent,
    });
    const stopTaskTimer = startTaskTimerWithEventLoopMonitoring(this.eventLoopDelayConfig);

    // Validate state
    const stateValidationResult = this.validateTaskState(this.instance.task);

    if (stateValidationResult.error) {
      const processedResult = await withSpan({ name: 'process result', type: 'task manager' }, () =>
        this.processResult(
          asErr({
            error: stateValidationResult.error,
            state: stateValidationResult.taskInstance.state,
            shouldValidate: false,
          }),
          stopTaskTimer()
        )
      );
      if (apmTrans) apmTrans.end('failure');
      return processedResult;
    }

    const modifiedContext = await this.beforeRun({
      taskInstance: stateValidationResult.taskInstance,
    });

    this.onTaskEvent(
      asTaskManagerStatEvent(
        'runDelay',
        asOk(getTaskDelayInSeconds(this.instance.task.scheduledAt))
      )
    );

    try {
      this.task = this.definition.createTaskRunner(modifiedContext);

      const ctx = {
        type: 'task manager',
        name: `run ${this.instance.task.taskType}`,
        id: this.instance.task.id,
        description: 'run task',
      };

      const result = await this.executionContext.withContext(ctx, () =>
        withSpan({ name: 'run', type: 'task manager' }, () => this.task!.run())
      );

      const validatedResult = this.validateResult(result);
      const processedResult = await withSpan({ name: 'process result', type: 'task manager' }, () =>
        this.processResult(validatedResult, stopTaskTimer())
      );
      if (apmTrans) apmTrans.end('success');
      return processedResult;
    } catch (err) {
      this.logger.error(`Task ${this} failed: ${err}`, {
        tags: [this.taskType, this.instance.task.id, 'task-run-failed'],
        error: { stack_trace: err.stack },
      });
      // in error scenario, we can not get the RunResult
      // re-use modifiedContext's state, which is correct as of beforeRun
      const processedResult = await withSpan({ name: 'process result', type: 'task manager' }, () =>
        this.processResult(
          asErr({ error: err, state: modifiedContext.taskInstance.state }),
          stopTaskTimer()
        )
      );
      if (apmTrans) apmTrans.end('failure');
      return processedResult;
    } finally {
      this.logger.debug(`Task ${this} ended`, { tags: ['task:end', this.id, this.taskType] });
    }
  }

  private validateTaskState(taskInstance: ConcreteTaskInstance) {
    const { taskType, id } = taskInstance;
    try {
      const validatedTaskInstance =
        this.taskValidator.getValidatedTaskInstanceFromReading(taskInstance);
      return { taskInstance: validatedTaskInstance, error: null };
    } catch (error) {
      this.logger.warn(`Task (${taskType}/${id}) has a validation error: ${error.message}`);
      return { taskInstance, error };
    }
  }

  public async removeTask(): Promise<void> {
    await this.bufferedTaskStore.remove(this.id);
    if (this.task?.cleanup) {
      try {
        await this.task.cleanup();
      } catch (e) {
        this.logger.error(
          `Error encountered when running onTaskRemoved() hook for ${this}: ${e.message}`
        );
      }
    }
  }

  /**
   * Attempts to claim exclusive rights to run the task. If the attempt fails
   * with a 409 (http conflict), we assume another Kibana instance beat us to the punch.
   *
   * @returns {Promise<boolean>}
   */
  public async markTaskAsRunning(): Promise<boolean> {
    if (!isPending(this.instance)) {
      throw new Error(
        `Marking task ${this} as running has failed as it ${
          isReadyToRun(this.instance) ? `is already running` : `has already been ran`
        }`
      );
    }

    const apmTrans = apm.startTransaction(
      TASK_MANAGER_TRANSACTION_TYPE_MARK_AS_RUNNING,
      TASK_MANAGER_TRANSACTION_TYPE
    );
    apmTrans.addLabels({ entityId: this.taskType });

    const now = new Date();
    try {
      const { taskInstance } = await this.beforeMarkRunning({
        taskInstance: this.instance.task,
      });

      const attempts = taskInstance.attempts + 1;
      const ownershipClaimedUntil = taskInstance.retryAt;

      const { id } = taskInstance;

      const timeUntilClaimExpires = howManyMsUntilOwnershipClaimExpires(ownershipClaimedUntil);
      if (timeUntilClaimExpires < 0) {
        this.logger.debug(
          `[Task Runner] Task ${id} started after ownership expired (${Math.abs(
            timeUntilClaimExpires
          )}ms after expiry)`
        );
      }

      this.instance = asReadyToRun(
        (await this.bufferedTaskStore.update(
          {
            ...taskWithoutEnabled(taskInstance),
            status: TaskStatus.Running,
            startedAt: now,
            attempts,
            retryAt:
              (this.instance.task.schedule
                ? maxIntervalFromDate(now, this.instance.task.schedule.interval, this.timeout)
                : this.getRetryDelay({
                    attempts,
                    // Fake an error. This allows retry logic when tasks keep timing out
                    // and lets us set a proper "retryAt" value each time.
                    error: new Error('Task timeout'),
                    addDuration: this.timeout,
                  })) ?? null,
            // This is a safe conversion as we're setting the startAt above
          },
          { validate: false }
        )) as ConcreteTaskInstanceWithStartedAt
      );

      const timeUntilClaimExpiresAfterUpdate =
        howManyMsUntilOwnershipClaimExpires(ownershipClaimedUntil);
      if (timeUntilClaimExpiresAfterUpdate < 0) {
        this.logger.debug(
          `[Task Runner] Task ${id} ran after ownership expired (${Math.abs(
            timeUntilClaimExpiresAfterUpdate
          )}ms after expiry)`
        );
      }

      if (apmTrans) apmTrans.end('success');
      this.onTaskEvent(asTaskMarkRunningEvent(this.id, asOk(this.instance.task)));
      return true;
    } catch (error) {
      if (apmTrans) apmTrans.end('failure');
      this.onTaskEvent(asTaskMarkRunningEvent(this.id, asErr(error)));
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
          // try to release claim as an unknown failure prevented us from marking as running
          mapErr((errReleaseClaim: Error) => {
            this.logger.error(
              `[Task Runner] Task ${this.id} failed to release claim after failure: Error: ${errReleaseClaim.message}`
            );
          }, await this.releaseClaimAndIncrementAttempts());
        }

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
    if (task?.cancel) {
      // it will cause the task state of "running" to be cleared
      this.task = undefined;
      return task.cancel();
    }

    this.logger.debug(`The task ${this} is not cancellable.`);
  }

  private validateResult(
    result?: SuccessfulRunResult | FailedRunResult | void
  ): Result<SuccessfulRunResult, FailedRunResult> {
    return isFailedRunResult(result)
      ? asErr({ ...result, error: result.error })
      : asOk({
          ...(result || EMPTY_RUN_RESULT),
        });
  }

  private async releaseClaimAndIncrementAttempts(): Promise<Result<ConcreteTaskInstance, Error>> {
    return promiseResult(
      this.bufferedTaskStore.update(
        {
          ...taskWithoutEnabled(this.instance.task),
          status: TaskStatus.Idle,
          attempts: this.instance.task.attempts + 1,
          startedAt: null,
          retryAt: null,
          ownerId: null,
        },
        { validate: false }
      )
    );
  }

  private shouldTryToScheduleRetry(): boolean {
    if (this.instance.task.schedule) {
      return true;
    }

    if (this.isExpired) {
      this.logger.warn(`Skipping reschedule for task ${this} due to the task expiring`);
      return false;
    }

    return this.instance.task.attempts < this.getMaxAttempts();
  }

  private rescheduleFailedRun = (
    failureResult: FailedRunResult
  ): Result<SuccessfulRunResult, FailedTaskResult> => {
    const { state, error } = failureResult;
    const { schedule, attempts } = this.instance.task;

    if (this.shouldTryToScheduleRetry() && !isUnrecoverableError(error)) {
      // if we're retrying, keep the number of attempts

      const reschedule = failureResult.runAt
        ? { runAt: failureResult.runAt }
        : failureResult.schedule
        ? { schedule: failureResult.schedule }
        : schedule
        ? { schedule }
        : // when result.error is truthy, then we're retrying because it failed
          {
            runAt: this.getRetryDelay({
              attempts,
              error,
            }),
          };

      if (reschedule.runAt || reschedule.schedule) {
        return asOk({
          state,
          attempts,
          ...reschedule,
        });
      }
    }

    // scheduling a retry isn't possible,mark task as failed
    return asErr({ status: TaskStatus.Failed });
  };

  private async processResultForRecurringTask(
    result: Result<SuccessfulRunResult, FailedRunResult>
  ): Promise<TaskRunResult> {
    const hasTaskRunFailed = isOk(result);
    const fieldUpdates: Partial<ConcreteTaskInstance> & Pick<ConcreteTaskInstance, 'status'> = flow(
      // if running the task has failed ,try to correct by scheduling a retry in the near future
      mapErr(this.rescheduleFailedRun),
      // if retrying is possible (new runAt) or this is an recurring task - reschedule
      mapOk(
        ({
          runAt,
          schedule: reschedule,
          state,
          attempts = 0,
        }: SuccessfulRunResult & { attempts: number }) => {
          const { startedAt, schedule } = this.instance.task;

          return asOk({
            runAt:
              runAt || intervalFromDate(startedAt!, reschedule?.interval ?? schedule?.interval)!,
            state,
            schedule: reschedule ?? schedule,
            attempts,
            status: TaskStatus.Idle,
          });
        }
      ),
      unwrap
    )(result);

    if (this.isExpired) {
      this.usageCounter?.incrementCounter({
        counterName: `taskManagerUpdateSkippedDueToTaskExpiration`,
        counterType: 'taskManagerTaskRunner',
        incrementBy: 1,
      });
    } else if (fieldUpdates.status === TaskStatus.Failed) {
      // Delete the SO instead so it doesn't remain in the index forever
      this.instance = asRan(this.instance.task);
      await this.removeTask();
    } else {
      const { shouldValidate = true } = unwrap(result);
      this.instance = asRan(
        await this.bufferedTaskStore.update(
          defaults(
            {
              ...fieldUpdates,
              // reset fields that track the lifecycle of the concluded `task run`
              startedAt: null,
              retryAt: null,
              ownerId: null,
            },
            taskWithoutEnabled(this.instance.task)
          ),
          { validate: shouldValidate }
        )
      );
    }

    return fieldUpdates.status === TaskStatus.Failed
      ? TaskRunResult.Failed
      : hasTaskRunFailed
      ? TaskRunResult.SuccessRescheduled
      : TaskRunResult.RetryScheduled;
  }

  private async processResultWhenDone(): Promise<TaskRunResult> {
    // not a recurring task: clean up by removing the task instance from store
    try {
      this.instance = asRan(this.instance.task);
      await this.removeTask();
    } catch (err) {
      if (err.statusCode === 404) {
        this.logger.warn(`Task cleanup of ${this} failed in processing. Was remove called twice?`);
      } else {
        throw err;
      }
    }
    return TaskRunResult.Success;
  }

  private async processResult(
    result: Result<SuccessfulRunResult, FailedRunResult>,
    taskTiming: TaskTiming
  ): Promise<Result<SuccessfulRunResult, FailedRunResult>> {
    const { task } = this.instance;

    const taskHasExpired = this.isExpired;

    await eitherAsync(
      result,
      async ({ runAt, schedule, taskRunError }: SuccessfulRunResult) => {
        const processedResult = {
          task,
          persistence:
            schedule || task.schedule ? TaskPersistence.Recurring : TaskPersistence.NonRecurring,
          result: await (runAt || schedule || task.schedule
            ? this.processResultForRecurringTask(result)
            : this.processResultWhenDone()),
        };

        // Alerting task runner returns SuccessfulRunResult with taskRunError
        // when the alerting task fails, so we check for this condition in order
        // to emit the correct task run event for metrics collection
        // taskRunError contains the "source" (TaskErrorSource) data
        const taskRunEvent = !!taskRunError
          ? asTaskRunEvent(
              this.id,
              asErr({
                ...processedResult,
                isExpired: taskHasExpired,
                error: taskRunError,
              }),
              taskTiming
            )
          : asTaskRunEvent(
              this.id,
              asOk({ ...processedResult, isExpired: taskHasExpired }),
              taskTiming
            );
        this.onTaskEvent(taskRunEvent);
      },
      async ({ error }: FailedRunResult) => {
        this.onTaskEvent(
          asTaskRunEvent(
            this.id,
            asErr({
              task,
              persistence: task.schedule ? TaskPersistence.Recurring : TaskPersistence.NonRecurring,
              result: await this.processResultForRecurringTask(result),
              isExpired: this.isExpired,
              error,
            }),
            taskTiming
          )
        );
      }
    );

    const { eventLoopBlockMs = 0 } = taskTiming;
    const taskLabel = `${this.taskType} ${this.instance.task.id}`;
    if (eventLoopBlockMs > this.eventLoopDelayConfig.warn_threshold) {
      this.logger.warn(
        `event loop blocked for at least ${eventLoopBlockMs} ms while running task ${taskLabel}`,
        {
          tags: [this.taskType, taskLabel, 'event-loop-blocked'],
        }
      );
    }
    return result;
  }

  private getRetryDelay({
    error,
    attempts,
    addDuration,
  }: {
    error: Error;
    attempts: number;
    addDuration?: string;
  }): Date | undefined {
    const retry: boolean | Date = isRetryableError(error) ?? true;

    let result;
    if (retry instanceof Date) {
      result = retry;
    } else if (retry === true) {
      result = new Date(Date.now() + calculateDelay(attempts));
    }

    // Add a duration to the result
    if (addDuration && result) {
      result = intervalFromDate(result, addDuration)!;
    }
    return result;
  }

  private getMaxAttempts() {
    return this.definition.maxAttempts !== undefined
      ? this.definition.maxAttempts
      : this.defaultMaxAttempts;
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

// Omits "enabled" field from task updates so we don't overwrite any user
// initiated changes to "enabled" while the task was running
function taskWithoutEnabled(task: ConcreteTaskInstance): ConcreteTaskInstance {
  return omit(task, 'enabled');
}

// A type that extracts the Instance type out of TaskRunningStage
// This helps us to better communicate to the developer what the expected "stage"
// in a specific place in the code might be
type InstanceOf<S extends TaskRunningStage, T> = T extends TaskRunning<S, infer I> ? I : never;

export function isPending(taskRunning: TaskRunningInstance): taskRunning is PendingTask {
  return taskRunning.stage === TaskRunningStage.PENDING;
}
export function asPending(task: InstanceOf<TaskRunningStage.PENDING, PendingTask>): PendingTask {
  return {
    timestamp: new Date(),
    stage: TaskRunningStage.PENDING,
    task,
  };
}
export function isReadyToRun(taskRunning: TaskRunningInstance): taskRunning is ReadyToRunTask {
  return taskRunning.stage === TaskRunningStage.READY_TO_RUN;
}
export function asReadyToRun(
  task: InstanceOf<TaskRunningStage.READY_TO_RUN, ReadyToRunTask>
): ReadyToRunTask {
  return {
    timestamp: new Date(),
    stage: TaskRunningStage.READY_TO_RUN,
    task,
  };
}
export function asRan(task: InstanceOf<TaskRunningStage.RAN, RanTask>): RanTask {
  return {
    timestamp: new Date(),
    stage: TaskRunningStage.RAN,
    task,
  };
}

export function calculateDelay(attempts: number) {
  // Return 30s for the first retry attempt
  if (attempts === 1) {
    return 30 * 1000;
  } else {
    const defaultBackoffPerFailure = 5 * 60 * 1000;
    const maxDelay = 60 * 60 * 1000;
    // For each remaining attempt return an exponential delay with jitter that is capped at 1 hour.
    // We adjust the attempts by 2 to ensure that delay starts at 5m for the second retry attempt
    // and increases exponentially from there.
    return random(Math.min(maxDelay, defaultBackoffPerFailure * Math.pow(2, attempts - 2)));
  }
}

export function getTaskDelayInSeconds(scheduledAt: Date) {
  const now = new Date();
  return (now.valueOf() - scheduledAt.valueOf()) / 1000;
}
