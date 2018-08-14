/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/*
 * Type definitions and validations for tasks.
 */

/**
 * A loosely typed definition of the elasticjs wrapper. It's beyond the scope
 * of this work to try to make a comprehensive type definition of this.
 */
export type ElasticJs = (action: string, args: any) => Promise<any>;

/**
 * The run context is passed into a task's run function as its sole argument.
 */
export interface RunContext {
  /**
   * The elastic search js wrapper function which the task can use
   * to access Elastic.
   */
  callCluster: ElasticJs;

  /**
   * Task-specific parameters. e.g. for a monitoring task, this might
   * look something like { cluster: 'elasticsearch-1', email: 'admin@example.com' }.
   * As far as the task manager is concerned, this is just a data blob.
   */
  params: object;

  /**
   * Task-specific state. Unlike params (which are usually user generated, task-specific
   * configuration), the state is something that may change with each run. Each run
   * can return a state object which will be passed to the next run, allowing tasks
   * to essentially be stateful without having to manage the state themselves.
   */
  state: object;
}

/**
 * The return value of a task's run function should be a promise of RunResult.
 */
export interface RunResult {
  /**
   * Specifies the next run date / time for this task. If unspecified, the system
   * will reschedule the task based on the interval defined by the tasks' definition.
   * If there is no runAt and there is no interval in the task's definition, this
   * is treated as a single-run task, and will not be rescheduled after completion.
   */
  runAt?: Date;

  /**
   * If specified, indicates that the task failed to accomplish its work. This is
   * logged out as a warning, and the task will be reattempted after a delay.
   */
  error?: object;

  /**
   * The state which will be passed to the next run of this task (if this is a
   * recurring task). See the RunContext type definition for more details.
   */
  state?: object;
}

/**
 * The type signature of the function that performs a task.
 */
export type RunFunction = (context: RunContext) => Promise<RunResult>;

/**
 * Defines a task which can be scheduled and run by the Kibana
 * task manager.
 */
export interface TaskDefinition {
  /**
   * A unique identifier for the type of task being defined.
   */
  type: string;

  /**
   * A brief, human-friendly title for this task.
   */
  title: string;

  /**
   * An optional more detailed description of what this task does.
   */
  description?: string;

  /**
   * How long, in minutes, the system should wait for the task to complete
   * before it is considered to be timed out. (e.g. '5m', the default). If
   * the task takes longer than this, Kibana will send it a kill command and
   * the task will be re-attempted.
   */
  timeOut?: string;

  /**
   * The maximum number of tasks of this type that any single task manager
   * will allow to run concurrently.
   */
  maxConcurrency: number;

  /**
   * A function which, does the work this task is built to do. Note,
   * this is a *function* and is not guaranteed to be called with
   * the *this* context of the task.
   *
   * @memberof TaskDefinition
   */
  run: RunFunction;
}

export const validateTaskDefinition = Joi.object({
  type: Joi.string().required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  timeOut: Joi.string().default('5m'),
  maxConcurrency: Joi.number().default(0), // Unlimited, as <= 0 is invalid
  run: Joi.func().required(),
}).default();

/**
 * A dictionary mapping task types to their definitions.
 */
export interface TaskDictionary {
  [taskType: string]: TaskDefinition;
}

export type TaskStatus = 'idle' | 'running';

/*
 * A task instance represents all of the data required to store, fetch,
 * and execute a task.
 */
export interface TaskInstance {
  /**
   * The task definition type whose run function will execute this instance.
   */
  type: string;

  /**
   * The date and time that this task is scheduled to be run. It is not guaranteed
   * to run at this time, but it is guaranteed not to run earlier than this.
   */
  runAt: Date;

  /**
   * An interval in minutes (e.g. '5m'). If specified, this is a recurring task.
   */
  interval?: string;

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
   * A task-specific set of parameters, used by the task's run function to tailor
   * its work. This is generally user-input, such as { sms: '333-444-2222' }.
   */
  params: object;

  /**
   * The state passed into the task's run function, and returned by the previous
   * run. If there was no previous run, or if the previous run did not return
   * any state, this will be the empy object: {}
   */
  state: object;

  /**
   * The id of the user who scheduled this task.
   */
  user: string;

  /**
   * Used to group tasks for querying. So, reporting might schedule tasks with a scope of 'reporting',
   * and then query such tasks to provide a glimpse at only reporting tasks, rather than at all tasks.
   */
  scope: string | string[];
}

/**
 * A task instance that has an id and is ready for storage.
 */
export interface ConcreteTaskInstance extends TaskInstance {
  /**
   * The id of the Elastic document that stores this instance's data.
   */
  id: string;

  /**
   * The version of the Elaticsearch document.
   */
  version: number;
}
