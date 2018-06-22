/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { taskClaimer } from './task_claimer';
import { intervalFromNow } from './task_intervals';
import {
  LogFn,
  RunningTask,
  TaskDefinitions,
  TaskDoc,
  TaskPoolStats,
  TaskStore,
} from './types';

const TASK_RUNNER_TYPE = 'task_manager_runner';

export interface TaskPoolOpts {
  maxPoolSize: number;
  pollInterval: number;
  store: TaskStore;
  taskDefinitions: TaskDefinitions;
  log: LogFn;
}

/**
 * Starts the task pool, which will poll the task manager index for work
 * and execute up to maxPoolSize tasks at a time.
 *
 * @param opts
 * @prop {number} maxPoolSize - The maximum number of tasks to run at a time
 * @prop {number} pollInterval - How often (in milliseconds) to look for more work
 * @prop {TaskStore} store - The task manager index store
 * @prop {TaskDefinitions} taskDefinitions - A dictionary of tasks { type: taskDefinition }
 * @prop {LogFn} log - A function which writes to the Kibana log
 */
export function startTaskPool(opts: TaskPoolOpts) {
  assertValidOpts();

  const { maxPoolSize, pollInterval, store, taskDefinitions, log } = opts;

  const tasks: RunningTask[] = [];

  const knownTypes = Object.keys(taskDefinitions);

  // This is a function which feeds us a task at a time from the index
  const claimTask = taskClaimer({
    knownTypes,
    store,
    tasks,
  });

  function assertValidOpts() {
    if (opts.pollInterval < 1000) {
      throw new Error(
        `Invalid pollInterval ${opts.pollInterval}.` +
          ` pollInterval must be at least 1000 milliseconds.`
      );
    }

    if (opts.maxPoolSize < 1) {
      throw new Error(
        `Invalid maxPoolSize ${opts.maxPoolSize}.` +
          ` maxPoolSize must be at least 1.`
      );
    }
  }

  /**
   * When called, checks the task manager index for any unclaimed tasks that
   * are ready to be run. This can be called concurrently with little to no perf hit.
   */
  function checkForWork() {
    const availableSpace = maxPoolSize - tasks.length;

    for (let i = 0; i < availableSpace; ++i) {
      const runner = taskRunner();
      tasks.push(runner);

      // No matter what, we need to make sure to free up room in the pool
      runner.promise
        .catch(_.noop)
        .then(() => _.remove(tasks, t => t === runner));
    }
  }

  /**
   * Provides statistics about the health of a task pool instance,
   * things such as what tasks are running, how long have they been running,
   * how busy is the pool, etc.
   */
  function getStats(): TaskPoolStats {
    return {
      freeCapacity: maxPoolSize - tasks.length,
      runningTasks: tasks.map(({ id, startTime, type }) => ({
        id,
        startTime,
        type,
      })),
    };
  }

  /**
   * A special task whose responsibility is simply to check the index
   * for a scheduled task. If it finds and claims a scheduled task,
   * it replaces itself in the work queue with the task that it found.
   */
  function taskRunner(): RunningTask {
    const runner: RunningTask = {
      id: `${TASK_RUNNER_TYPE}:${_.uniqueId()}`,
      promise: claimTask().then(task => {
        // No work was found, so we just exit.
        if (!task) {
          return;
        }

        // Modify our status to indicate that
        // we have found a scheduled task to run.
        updateRunnerStatus(runner, task);

        // We found work. perform it and check for more
        // when complete, rather than waiting for the poll interval.
        return runTask(task)
          .catch(_.noop)
          .then(() => process.nextTick(checkForWork));
      }),
      startTime: new Date(),
      type: TASK_RUNNER_TYPE,
    };

    return runner;
  }

  /**
   * Changes the runner task to reflect that it succeeded in claiming
   * a task, and that it is now running that task.
   *
   * @param runner - The runner task (see taskRunner() for details)
   * @param task - The task that the runner owns.
   */
  function updateRunnerStatus(runner: RunningTask, task: TaskDoc) {
    runner.id = task.id;
    runner.type = task.type;
    runner.startTime = new Date();
    return task;
  }

  /**
   * Runs the specified task, handling success / failure, rescheduling
   * recurring tasks, etc.
   */
  async function runTask(task: TaskDoc) {
    const handleResult = taskResultHandler(task);

    const taskDefinition = getTaskDefinition(task);

    const context = {
      callCluster: () => Promise.reject('TODO: real connection'),
      params: task.params,
      previousResult: task.previousResult,
    };

    const promise = taskDefinition.run(context);

    promise.catch(error =>
      log(
        ['error', 'task_manager'],
        `An error occurred while running task ${task.id} of type ${
          task.type
        }: ${error.stack}`
      )
    );

    await handleResult(task, promise);

    return promise;
  }

  function getTaskDefinition(task: TaskDoc) {
    const definition = taskDefinitions[task.type];

    // This should never happen, as we explicitly query
    // only for known types, but to satisfy TypeScript, and
    // for extra safety, just in case...
    if (!definition) {
      throw new Error(`Task "${task.id}" has unknown type "${task.type}".`);
    }

    return definition;
  }

  /**
   * Returns the appropriate result handler for the spcified task.
   * A result handler is a function that dictates what should happen
   * when a task succeeds or fails.
   *
   * @param {TaskDoc} task - The task whose handler will be returned
   */
  function taskResultHandler(task: TaskDoc) {
    return task.interval ? recurringHandler : nonRecurringHandler;
  }

  /**
   * If the task is a one-time task, we'll remove it when it's done executing
   * regardless of whether or not it succeeded.
   */
  async function nonRecurringHandler(task: TaskDoc, promise: Promise<any>) {
    return promise.catch(_.noop).then(() => store.remove(task.id));
  }

  /**
   * If the task is recurring, we'll reschedule it regardless of whether it
   * succeeded or failed, though *how* we reschedule it varies based on
   * success (store result into previous state) failure (increment attempts).
   */
  async function recurringHandler(task: TaskDoc, promise: Promise<any>) {
    return promise
      .then(previousResult => ({ attempts: 0, previousResult }))
      .catch(() => ({ attempts: task.attempts + 1 }))
      .then(updates =>
        store.update({
          ...task,
          ...updates,
          nextRun: intervalFromNow(task.interval!),
          status: 'idle',
          timeOut: null,
        })
      );
  }

  /**
   * Occasionally checks the task manager index for more work.
   */
  function poll() {
    checkForWork();
    setTimeout(poll, pollInterval);
  }

  poll();

  return {
    checkForWork,
    getStats,
  };
}
