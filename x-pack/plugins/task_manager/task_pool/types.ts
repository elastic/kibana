/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This file contains all public type definitions, as well as any
 * definitions which need to be shared between modules. Internal types
 * are commented to indicate that they are not intended for use outside
 * of the task_pool module.
 */

// The Elasticsearch.js connection that is used to manage the
// task manager index.
export type CallCluster = (action: string, args: any) => Promise<any>;

// The Kibana logger
export type LogFn = (prefix: string[], message: string) => any;

/**
 * The object which is passed into a task's run function.
 *
 * @export
 * @interface TaskContext
 */
export interface TaskContext {
  /**
   * An elastic search connection that runs in the context of the
   * user (or system) that sheduled the task instance.
   *
   * @type {CallCluster}
   * @memberof TaskContext
   */
  callCluster: CallCluster;

  /**
   * An object containing the parameters that were specified when
   * the task was scheduled. The shape of this object is completely
   * up to the author of the task.
   *
   * @type {*}
   * @memberof TaskContext
   */
  params: any;

  /**
   * An object containing the result of the last successful run, if
   * this is a recurring task which has already succeeded one or more
   * times. If this is the first time the task has run, or if it has
   * never succeeded, this will be the empty object: {}
   *
   * @type {*}
   * @memberof TaskContext
   */
  previousResult: any;
}

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
   * A function which, does the work this task is built to do. Note,
   * this is a *function* and is not guaranteed to be called with
   * the *this* context of the task.
   *
   * @memberof TaskDefinition
   */
  run: (context: TaskContext) => Promise<any>;
}

export interface TaskDefinitions {
  [type: string]: TaskDefinition;
}

// Internal, a task that is currently running
export interface RunningTask {
  id: string;
  promise: Promise<any>;
  startTime: Date;
  type: string;
}

export type TaskStatus = 'idle' | 'running';

// Internal, more convenient representation of a task
export interface TaskDoc {
  attempts: number;
  id: string;
  interval?: string;
  nextRun: Date;
  params: object;
  previousResult: object;
  status: TaskStatus;
  timeOut: Date | null;
  type: string;
  version: number;
}

/**
 * Stats on the health of a task pool.
 */
export interface TaskPoolStats {
  /**
   * An integer representing how much space is left in the task
   * pool. (e.g. if a task pool's maxPoolSize is 10 and 3 tasks
   * are running, this will be 7).
   */
  freeCapacity: number;

  /**
   * Stats about individual tasks that are currently running
   * in the pool.
   */
  runningTasks: TaskStats[];
}

/**
 * Stats about an individual task taht is running in a pool
 */
export interface TaskStats {
  /**
   * The id of the running task.
   */
  id: string;

  /**
   * The type of the running task, corresponding to a task definition.
   */
  type: string;

  /**
   * The time the task started running in the pool.
   */
  startTime: Date;
}

// TaskStore is a light-weight layer on top of an elastic search
// connection. This is a raw, system-level connection that can make
// any changes neccessary to the index.
export interface TaskStore {
  availableTasks: (query: TaskQuery) => Promise<TaskDoc[]>;
  update: (task: TaskDoc) => Promise<TaskDoc>;
  remove: (id: string) => Promise<void>;
}

export interface TaskQuery {
  knownTypes: string[];
  runningIds: string[];
}
