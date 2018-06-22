/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { intervalFromNow } from './task_intervals';
import { RunningTask, TaskDoc, TaskStore } from './types';

type AsyncFn<T> = () => Promise<T>;

export interface TaskClaimerOpts {
  store: TaskStore;
  tasks: RunningTask[];
  knownTypes: string[];
}

/**
 * Creates a function which retrieves a task from the task manager index,
 * claims it for this Kibana instance, and returns it. The created function
 * can safely be called numerous times concurrently, and ensures that each
 * caller is given a different task.
 *
 * @param {TaskClaimerOpts} opts
 * @prop {TaskStore} store
 * @prop {RunningTask[]} tasks - The array of running tasks
 * @prop {string[]} knownTypes - The list of supported task types
 * @export
 */
export function taskClaimer(opts: TaskClaimerOpts) {
  const readTask = taskReader(opts);

  return async function getClaimedTask(): Promise<TaskDoc | undefined> {
    while (true) {
      const task = await readTask();

      // The task queue is empty
      if (!task) {
        return;
      }

      // Attempt to claim the task. This may fail if another Kibana
      // instance claims it first, in which case, we'll loop around
      // and try again with a different task.
      const claimedTask = await claimTask(opts.store, task);

      if (claimedTask) {
        return claimedTask;
      }
    }
  };
}

/**
 * Attempts to mark a task as running. If this succeeds, it means that
 * this Kibana owns the task. If it fails with a version conflict, it
 * means another Kibana instance claimed the task before we could.
 */
async function claimTask(store: TaskStore, task: TaskDoc) {
  const VERSION_CONFLICT_STATUS = 409;

  try {
    return await store.update({
      ...task,
      status: 'running',
      timeOut: intervalFromNow(task.interval || '5m'),
    });
  } catch (error) {
    if (error.statusCode !== VERSION_CONFLICT_STATUS) {
      throw error;
    }
  }
}

/**
 * Creates a function which is used to allow multiple concurrent
 * "processes" to read docs from the index without each
 * having to make their own calls to Elastic, and without
 * each possibly receiving the same task document.
 */
function taskReader(opts: TaskClaimerOpts) {
  let queue: TaskDoc[] = [];

  const refreshQueue = singletonPromise(() =>
    fetchTasks(opts).then(q => {
      queue = q;
    })
  );

  return async () => {
    return queue.shift() || refreshQueue().then(() => queue.shift());
  };
}

/*
 * Wraps an async function with a guarantee that while a call to fn
 * is pending, all other calls will receive the same promise, thus
 * preventing multiple concurrent queries of the elasticsearch index.
 */
function singletonPromise<T>(fn: AsyncFn<T>): AsyncFn<T> {
  let promise: Promise<T> | undefined;

  const resetPromise = () => {
    promise = undefined;
  };

  return () => {
    if (!promise) {
      promise = fn();
      promise.then(resetPromise).catch(resetPromise);
    }

    return promise;
  };
}

/**
 * Fetches tasks from the index, which are ready to be run, avoiding
 * fetching of any tasks that are currently running or that have an
 * unsupported type.
 */
async function fetchTasks(opts: TaskClaimerOpts): Promise<TaskDoc[]> {
  const { store, tasks, knownTypes } = opts;

  const runningIds = tasks.map(t => t.id);

  return store.availableTasks({
    knownTypes,
    runningIds,
  });
}
