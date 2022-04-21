/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Interval, isInterval, parseIntervalAsMillisecond } from './lib/intervals';
import { isErr, tryAsResult } from './lib/result_type';

/*
 * Type definitions and validations for tasks.
 */

/**
 * Require
 * @desc Create a Subtype of type T `T` such that the property under key `P` becomes required
 * @example
 *    type TaskInstance = {
 *      id?: string;
 *      name: string;
 *    };
 *
 *    // This type is now defined as { id: string; name: string; }
 *    type TaskInstanceWithId = Require<TaskInstance, 'id'>;
 */
type Require<T extends object, P extends keyof T> = Omit<T, P> & Required<Pick<T, P>>;

/**
 * The run context is passed into a task's run function as its sole argument.
 */
export interface RunContext {
  /**
   * The document describing the task instance, its params, state, id, etc.
   */
  taskInstance: ConcreteTaskInstance;
}

/**
 * The return value of a task's run function should be a promise of RunResult.
 */

export type SuccessfulRunResult = {
  /**
   * The state which will be passed to the next run of this task (if this is a
   * recurring task). See the RunContext type definition for more details.
   */
  state: Record<string, unknown>;
} & (
  | // ensure a SuccessfulRunResult can either specify a new `runAt` or a new `schedule`, but not both
  {
      /**
       * Specifies the next run date / time for this task. If unspecified, this is
       * treated as a single-run task, and will not be rescheduled after
       * completion.
       */
      runAt?: Date;
      schedule?: never;
    }
  | {
      /**
       * Specifies a new schedule for this tasks. If unspecified, the task will
       * continue to use which ever schedule it already has, and if no there is
       * no previous schedule then it will be treated as a single-run task.
       */
      schedule?: IntervalSchedule;
      runAt?: never;
    }
);

export type FailedRunResult = SuccessfulRunResult & {
  /**
   * If specified, indicates that the task failed to accomplish its work. This is
   * logged out as a warning, and the task will be reattempted after a delay.
   */
  error: Error;
};

export type RunResult = FailedRunResult | SuccessfulRunResult;

export const isFailedRunResult = (result: unknown): result is FailedRunResult =>
  !!((result as FailedRunResult)?.error ?? false);

export interface FailedTaskResult {
  status: TaskStatus.Failed;
}

export type RunFunction = () => Promise<RunResult | undefined | void>;
export type CancelFunction = () => Promise<RunResult | undefined | void>;
export interface CancellableTask {
  run: RunFunction;
  cancel?: CancelFunction;
}

export type TaskRunCreatorFunction = (context: RunContext) => CancellableTask;

export const taskDefinitionSchema = schema.object(
  {
    /**
     * A unique identifier for the type of task being defined.
     */
    type: schema.string(),
    /**
     * A brief, human-friendly title for this task.
     */
    title: schema.maybe(schema.string()),
    /**
     * An optional more detailed description of what this task does.
     */
    description: schema.maybe(schema.string()),
    /**
     * How long, in minutes or seconds, the system should wait for the task to complete
     * before it is considered to be timed out. (e.g. '5m', the default). If
     * the task takes longer than this, Kibana will send it a kill command and
     * the task will be re-attempted.
     */
    timeout: schema.string({
      defaultValue: '5m',
    }),
    /**
     * Up to how many times the task should retry when it fails to run. This will
     * default to the global variable.
     */
    maxAttempts: schema.maybe(
      schema.number({
        min: 1,
      })
    ),
    /**
     * The maximum number tasks of this type that can be run concurrently per Kibana instance.
     * Setting this value will force Task Manager to poll for this task type seperatly from other task types
     * which can add significant load to the ES cluster, so please use this configuration only when absolutly necesery.
     */
    maxConcurrency: schema.maybe(
      schema.number({
        min: 0,
      })
    ),
  },
  {
    validate({ timeout }) {
      if (!isInterval(timeout) || isErr(tryAsResult(() => parseIntervalAsMillisecond(timeout)))) {
        return `Invalid timeout "${timeout}". Timeout must be of the form "{number}{cadance}" where number is an integer. Example: 5m.`;
      }
    },
  }
);

/**
 * Defines a task which can be scheduled and run by the Kibana
 * task manager.
 */
export type TaskDefinition = TypeOf<typeof taskDefinitionSchema> & {
  /**
   * Function that customizes how the task should behave when the task fails. This
   * function can return `true`, `false` or a Date. True will tell task manager
   * to retry using default delay logic. False will tell task manager to stop retrying
   * this task. Date will suggest when to the task manager the task should retry.
   * This function isn't used for recurring tasks, those retry as per their configured recurring schedule.
   */
  getRetry?: (attempts: number, error: object) => boolean | Date;

  /**
   * Creates an object that has a run function which performs the task's work,
   * and an optional cancel function which cancels the task.
   */
  createTaskRunner: TaskRunCreatorFunction;
};

export enum TaskStatus {
  Idle = 'idle',
  Claiming = 'claiming',
  Running = 'running',
  Failed = 'failed',
  Unrecognized = 'unrecognized',
}

export enum TaskLifecycleResult {
  NotFound = 'notFound',
}

export type TaskLifecycle = TaskStatus | TaskLifecycleResult;
export interface IntervalSchedule {
  /**
   * An interval in minutes (e.g. '5m'). If specified, this is a recurring task.
   * */
  interval: Interval;
}

/*
 * A task instance represents all of the data required to store, fetch,
 * and execute a task.
 */
export interface TaskInstance {
  /**
   * Optional ID that can be passed by the caller. When ID is undefined, ES
   * will auto-generate a unique id. Otherwise, ID will be used to either
   * create a new document, or update existing document
   */
  id?: string;

  /**
   * The task definition type whose run function will execute this instance.
   */
  taskType: string;

  /**
   * The date and time that this task was originally scheduled. This is used
   * for convenience to task run functions, and for troubleshooting.
   */
  scheduledAt?: Date;

  /**
   * The date and time that this task started execution. This is used to determine
   * the "real" runAt that ended up running the task. This value is only set
   * when status is set to "running".
   */
  startedAt?: Date | null;

  /**
   * The date and time that this task should re-execute if stuck in "running" / timeout
   * status. This value is only set when status is set to "running".
   */
  retryAt?: Date | null;

  /**
   * The date and time that this task is scheduled to be run. It is not
   * guaranteed to run at this time, but it is guaranteed not to run earlier
   * than this. Defaults to immediately.
   */
  runAt?: Date;

  /**
   * A TaskSchedule string, which specifies this as a recurring task.
   *
   * Currently, this supports a single format: an interval in minutes or seconds (e.g. '5m', '30s').
   */
  schedule?: IntervalSchedule;

  /**
   * A task-specific set of parameters, used by the task's run function to tailor
   * its work. This is generally user-input, such as { sms: '333-444-2222' }.
   */
  // we allow any here as unknown will break current use in other plugins
  // this can be fixed by supporting generics in the future
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;

  /**
   * The state passed into the task's run function, and returned by the previous
   * run. If there was no previous run, or if the previous run did not return
   * any state, this will be the empy object: {}
   */
  // we allow any here as unknown will break current use in other plugins
  // this can be fixed by supporting generics in the future
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: Record<string, any>;

  /**
   * The serialized traceparent string of the current APM transaction or span.
   */
  traceparent?: string;

  /**
   * The id of the user who scheduled this task.
   */
  user?: string;

  /**
   * Used to group tasks for querying. So, reporting might schedule tasks with a scope of 'reporting',
   * and then query such tasks to provide a glimpse at only reporting tasks, rather than at all tasks.
   */
  scope?: string[];

  /**
   * The random uuid of the Kibana instance which claimed ownership of the task last
   */
  ownerId?: string | null;
}

/**
 * Support for the depracated interval field, this should be removed in version 8.0.0
 * and marked as a breaking change, ideally nutil then all usage of `interval` will be
 * replaced with use of `schedule`
 */
export interface TaskInstanceWithDeprecatedFields extends TaskInstance {
  /**
   * An interval in minutes (e.g. '5m'). If specified, this is a recurring task.
   * */
  interval?: string;
}

/**
 * A task instance that has an id.
 */
export type TaskInstanceWithId = Require<TaskInstance, 'id'>;

/**
 * A task instance that has an id and is ready for storage.
 */
export interface ConcreteTaskInstance extends TaskInstance {
  /**
   * The id of the Elastic document that stores this instance's data. This can
   * be passed by the caller when scheduling the task.
   */
  id: string;

  /**
   * @deprecated This field has been moved under schedule (deprecated) with version 7.6.0
   */
  interval?: string;

  /**
   * The saved object version from the Elasticsearch document.
   */
  version?: string;

  /**
   * The date and time that this task was originally scheduled. This is used
   * for convenience to task run functions, and for troubleshooting.
   */
  scheduledAt: Date;

  /**
   * The number of unsuccessful attempts since the last successful run. This
   * will be zeroed out after a successful run.
   */
  attempts: number;

  /**
   * Indicates whether or not the task is currently running.
   */
  status: TaskStatus;

  /**
   * The date and time that this task is scheduled to be run. It is not guaranteed
   * to run at this time, but it is guaranteed not to run earlier than this.
   */
  runAt: Date;

  /**
   * The date and time that this task started execution. This is used to determine
   * the "real" runAt that ended up running the task. This value is only set
   * when status is set to "running".
   */
  startedAt: Date | null;

  /**
   * The date and time that this task should re-execute if stuck in "running" / timeout
   * status. This value is only set when status is set to "running".
   */
  retryAt: Date | null;

  /**
   * The state passed into the task's run function, and returned by the previous
   * run. If there was no previous run, or if the previous run did not return
   * any state, this will be the empy object: {}
   */
  // we allow any here as unknown will break current use in other plugins
  // this can be fixed by supporting generics in the future
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: Record<string, any>;

  /**
   * The random uuid of the Kibana instance which claimed ownership of the task last
   */
  ownerId: string | null;
}

/**
 * A task instance that has an id and is ready for storage.
 */
export type EphemeralTask = Pick<ConcreteTaskInstance, 'taskType' | 'params' | 'state' | 'scope'>;
export type EphemeralTaskInstance = EphemeralTask &
  Pick<ConcreteTaskInstance, 'id' | 'scheduledAt' | 'startedAt' | 'runAt' | 'status' | 'ownerId'>;

export type SerializedConcreteTaskInstance = Omit<
  ConcreteTaskInstance,
  'state' | 'params' | 'scheduledAt' | 'startedAt' | 'retryAt' | 'runAt'
> & {
  state: string;
  params: string;
  traceparent: string;
  scheduledAt: string;
  startedAt: string | null;
  retryAt: string | null;
  runAt: string;
};
