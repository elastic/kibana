/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, take } from 'rxjs/operators';
import pMap from 'p-map';

import uuid from 'uuid';
import { chunk, pick } from 'lodash';
import { Subject } from 'rxjs';
import agent from 'elastic-apm-node';
import { Logger } from '@kbn/core/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { mustBeAllOf } from './queries/query_clauses';
import { either, isErr, mapErr } from './lib/result_type';
import {
  ErroredTask,
  ErrResultOf,
  isTaskClaimEvent,
  isTaskRunEvent,
  isTaskRunRequestEvent,
  OkResultOf,
  RanTask,
} from './task_events';
import { Middleware } from './lib/middleware';
import { parseIntervalAsMillisecond } from './lib/intervals';
import {
  ConcreteTaskInstance,
  EphemeralTask,
  IntervalSchedule,
  TaskInstanceWithDeprecatedFields,
  TaskInstanceWithId,
  TaskStatus,
} from './task';
import { TaskStore } from './task_store';
import { ensureDeprecatedFieldsAreCorrected } from './lib/correct_deprecated_fields';
import { TaskLifecycleEvent } from './polling_lifecycle';
import { EphemeralTaskLifecycle } from './ephemeral_task_lifecycle';
import { EphemeralTaskRejectedDueToCapacityError } from './task_running';

const VERSION_CONFLICT_STATUS = 409;
const BULK_ACTION_SIZE = 100;
export interface TaskSchedulingOpts {
  logger: Logger;
  taskStore: TaskStore;
  ephemeralTaskLifecycle?: EphemeralTaskLifecycle;
  middleware: Middleware;
  taskManagerId: string;
}

/**
 * return type of TaskScheduling.bulkUpdateSchedules method
 */
export interface BulkUpdateTaskResult {
  /**
   * list of successfully updated tasks
   */
  tasks: ConcreteTaskInstance[];

  /**
   * list of failed tasks and errors caused failure
   */
  errors: Array<{ task: ConcreteTaskInstance; error: Error }>;
}
export interface RunSoonResult {
  id: ConcreteTaskInstance['id'];
}

export interface RunNowResult {
  id: ConcreteTaskInstance['id'];
  state?: ConcreteTaskInstance['state'];
}

export class TaskScheduling {
  private store: TaskStore;
  private ephemeralTaskLifecycle?: EphemeralTaskLifecycle;
  private logger: Logger;
  private middleware: Middleware;
  private taskManagerId: string;

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  constructor(opts: TaskSchedulingOpts) {
    this.logger = opts.logger;
    this.middleware = opts.middleware;
    this.ephemeralTaskLifecycle = opts.ephemeralTaskLifecycle;
    this.store = opts.taskStore;
    this.taskManagerId = opts.taskManagerId;
  }

  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  public async schedule(
    taskInstance: TaskInstanceWithDeprecatedFields,
    options?: Record<string, unknown>
  ): Promise<ConcreteTaskInstance> {
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...options,
      taskInstance: ensureDeprecatedFieldsAreCorrected(taskInstance, this.logger),
    });

    const traceparent =
      agent.currentTransaction && agent.currentTransaction.type !== 'request'
        ? agent.currentTraceparent
        : '';

    return await this.store.schedule({
      ...modifiedTask,
      traceparent: traceparent || '',
      enabled: modifiedTask.enabled ?? true,
    });
  }

  /**
   * Bulk schedules a task.
   *
   * @param tasks - The tasks being scheduled.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  public async bulkSchedule(
    taskInstances: TaskInstanceWithDeprecatedFields[],
    options?: Record<string, unknown>
  ): Promise<ConcreteTaskInstance[]> {
    const traceparent =
      agent.currentTransaction && agent.currentTransaction.type !== 'request'
        ? agent.currentTraceparent
        : '';
    const modifiedTasks = await Promise.all(
      taskInstances.map(async (taskInstance) => {
        const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
          ...options,
          taskInstance: ensureDeprecatedFieldsAreCorrected(taskInstance, this.logger),
        });
        return {
          ...modifiedTask,
          traceparent: traceparent || '',
          enabled: modifiedTask.enabled ?? true,
        };
      })
    );

    return await this.store.bulkSchedule(modifiedTasks);
  }

  public async bulkDisable(taskIds: string[]) {
    const enabledTasks = await this.bulkGetTasksHelper(taskIds, {
      term: {
        'task.enabled': true,
      },
    });

    const updatedTasks = enabledTasks
      .flatMap(({ docs }) => docs)
      .reduce<ConcreteTaskInstance[]>((acc, task) => {
        // if task is not enabled, no need to update it
        if (!task.enabled) {
          return acc;
        }

        acc.push({ ...task, enabled: false });
        return acc;
      }, []);

    return await this.bulkUpdateTasksHelper(updatedTasks);
  }

  public async bulkEnable(taskIds: string[], runSoon: boolean = true) {
    const disabledTasks = await this.bulkGetTasksHelper(taskIds, {
      term: {
        'task.enabled': false,
      },
    });

    const updatedTasks = disabledTasks
      .flatMap(({ docs }) => docs)
      .reduce<ConcreteTaskInstance[]>((acc, task) => {
        // if task is enabled, no need to update it
        if (task.enabled) {
          return acc;
        }

        if (runSoon) {
          acc.push({ ...task, enabled: true, scheduledAt: new Date(), runAt: new Date() });
        } else {
          acc.push({ ...task, enabled: true });
        }

        return acc;
      }, []);

    return await this.bulkUpdateTasksHelper(updatedTasks);
  }

  /**
   * Bulk updates schedules for tasks by ids.
   * Only tasks with `idle` status will be updated, as for the tasks which have `running` status,
   * `schedule` and `runAt` will be recalculated after task run finishes
   *
   * @param {string[]} taskIds  - list of task ids
   * @param {IntervalSchedule} schedule  - new schedule
   * @returns {Promise<BulkUpdateTaskResult>}
   */
  public async bulkUpdateSchedules(
    taskIds: string[],
    schedule: IntervalSchedule
  ): Promise<BulkUpdateTaskResult> {
    const tasks = await this.bulkGetTasksHelper(taskIds, {
      term: {
        'task.status': 'idle',
      },
    });

    const updatedTasks = tasks
      .flatMap(({ docs }) => docs)
      .reduce<ConcreteTaskInstance[]>((acc, task) => {
        // if task schedule interval is the same, no need to update it
        if (task.schedule?.interval === schedule.interval) {
          return acc;
        }

        const oldIntervalInMs = parseIntervalAsMillisecond(task.schedule?.interval ?? '0s');

        // computing new runAt using formula:
        // newRunAt = oldRunAt - oldInterval + newInterval
        const newRunAtInMs = Math.max(
          Date.now(),
          task.runAt.getTime() - oldIntervalInMs + parseIntervalAsMillisecond(schedule.interval)
        );

        acc.push({ ...task, schedule, runAt: new Date(newRunAtInMs) });
        return acc;
      }, []);

    return await this.bulkUpdateTasksHelper(updatedTasks);
  }

  private async bulkGetTasksHelper(taskIds: string[], ...must: QueryDslQueryContainer[]) {
    return await pMap(
      chunk(taskIds, BULK_ACTION_SIZE),
      async (taskIdsChunk) =>
        this.store.fetch({
          query: mustBeAllOf(
            {
              terms: {
                _id: taskIdsChunk.map((taskId) => `task:${taskId}`),
              },
            },
            ...must
          ),
          size: BULK_ACTION_SIZE,
        }),
      { concurrency: 10 }
    );
  }

  private async bulkUpdateTasksHelper(updatedTasks: ConcreteTaskInstance[]) {
    return (await this.store.bulkUpdate(updatedTasks)).reduce<BulkUpdateTaskResult>(
      (acc, task) => {
        if (task.tag === 'ok') {
          acc.tasks.push(task.value);
        } else {
          acc.errors.push({ error: task.error.error, task: task.error.entity });
        }

        return acc;
      },
      { tasks: [], errors: [] }
    );
  }

  /**
   * Run task.
   *
   * @param taskId - The task being scheduled.
   * @returns {Promise<RunSoonResult>}
   */
  public async runSoon(taskId: string): Promise<RunSoonResult> {
    const task = await this.getNonRunningTask(taskId);
    try {
      await this.store.update({
        ...task,
        status: TaskStatus.Idle,
        scheduledAt: new Date(),
        runAt: new Date(),
      });
    } catch (e) {
      if (e.statusCode === 409) {
        this.logger.debug(
          `Failed to update the task (${taskId}) for runSoon due to conflict (409)`
        );
      } else {
        this.logger.error(`Failed to update the task (${taskId}) for runSoon`);
        throw e;
      }
    }
    return { id: task.id };
  }

  /**
   * Run an ad-hoc task in memory without persisting it into ES or distributing the load across the cluster.
   *
   * @param task - The ephemeral task being queued.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  public async ephemeralRunNow(
    task: EphemeralTask,
    options?: Record<string, unknown>
  ): Promise<RunNowResult> {
    if (!this.ephemeralTaskLifecycle) {
      throw new EphemeralTaskRejectedDueToCapacityError(
        `Ephemeral Task of type ${task.taskType} was rejected because ephemeral tasks are not supported`,
        task
      );
    }
    const id = uuid.v4();
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...options,
      taskInstance: task,
    });
    return new Promise(async (resolve, reject) => {
      try {
        // The actual promise returned from this function is resolved after the awaitTaskRunResult promise resolves.
        // However, we do not wait to await this promise, as we want later execution to happen in parallel.
        // The awaitTaskRunResult promise is resolved once the ephemeral task is successfully executed (technically, when a TaskEventType.TASK_RUN is emitted with the same id).
        // However, the ephemeral task won't even get into the queue until the subsequent this.ephemeralTaskLifecycle.attemptToRun is called (which puts it in the queue).
        // The reason for all this confusion? Timing.
        // In the this.ephemeralTaskLifecycle.attemptToRun, it's possible that the ephemeral task is put into the queue and processed before this function call returns anything.
        // If that happens, putting the awaitTaskRunResult after would just hang because the task already completed. We need to listen for the completion before we add it to the queue to avoid this possibility.
        const { cancel, resolveOnCancel } = cancellablePromise();
        this.awaitTaskRunResult(id, resolveOnCancel)
          .then((arg: RunNowResult) => {
            resolve(arg);
          })
          .catch((err: Error) => {
            reject(err);
          });
        const attemptToRunResult = this.ephemeralTaskLifecycle!.attemptToRun({
          id,
          scheduledAt: new Date(),
          runAt: new Date(),
          status: TaskStatus.Idle,
          ownerId: this.taskManagerId,
          ...modifiedTask,
        });

        if (isErr(attemptToRunResult)) {
          cancel();
          reject(
            new EphemeralTaskRejectedDueToCapacityError(
              `Ephemeral Task of type ${task.taskType} was rejected`,
              task
            )
          );
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Schedules a task with an Id
   *
   * @param task - The task being scheduled.
   * @returns {Promise<TaskInstanceWithId>}
   */
  public async ensureScheduled(
    taskInstance: TaskInstanceWithId,
    options?: Record<string, unknown>
  ): Promise<TaskInstanceWithId> {
    try {
      return await this.schedule(taskInstance, options);
    } catch (err) {
      if (err.statusCode === VERSION_CONFLICT_STATUS) {
        return taskInstance;
      }
      throw err;
    }
  }

  private awaitTaskRunResult(taskId: string, cancel?: Promise<void>): Promise<RunNowResult> {
    return new Promise((resolve, reject) => {
      if (!this.ephemeralTaskLifecycle) {
        reject(
          new Error(
            `Failed to run task "${taskId}" because ephemeral tasks are not supported. Rescheduled the task to ensure it is picked up as soon as possible.`
          )
        );
      }
      // listen for all events related to the current task
      const subscription = this.ephemeralTaskLifecycle!.events.pipe(
        filter(({ id }: TaskLifecycleEvent) => id === taskId)
      ).subscribe((taskEvent: TaskLifecycleEvent) => {
        if (isTaskClaimEvent(taskEvent)) {
          mapErr(async (error: Error) => {
            // reject if any error event takes place for the requested task
            subscription.unsubscribe();
          }, taskEvent.event);
        } else {
          either<OkResultOf<TaskLifecycleEvent>, ErrResultOf<TaskLifecycleEvent>>(
            taskEvent.event,
            (taskInstance: OkResultOf<TaskLifecycleEvent>) => {
              // resolve if the task has run sucessfully
              if (isTaskRunEvent(taskEvent)) {
                subscription.unsubscribe();
                resolve(pick((taskInstance as RanTask).task, ['id', 'state']));
              }
            },
            async (errorResult: ErrResultOf<TaskLifecycleEvent>) => {
              // reject if any error event takes place for the requested task
              subscription.unsubscribe();
              return reject(
                new Error(
                  `Failed to run task "${taskId}": ${
                    isTaskRunRequestEvent(taskEvent)
                      ? `Task Manager is at capacity, please try again later`
                      : isTaskRunEvent(taskEvent)
                      ? `${(errorResult as ErroredTask).error}`
                      : `${errorResult}`
                  }`
                )
              );
            }
          );
        }
      });

      if (cancel) {
        cancel.then(() => {
          subscription.unsubscribe();
        });
      }
    });
  }

  private async getNonRunningTask(taskId: string) {
    const task = await this.store.get(taskId);
    switch (task.status) {
      case TaskStatus.Claiming:
      case TaskStatus.Running:
        throw Error(`Failed to run task "${taskId}" as it is currently running`);
      case TaskStatus.Unrecognized:
        throw Error(`Failed to run task "${taskId}" with status ${task.status}`);
      case TaskStatus.Failed:
      default:
        return task;
    }
  }
}

const cancellablePromise = () => {
  const boolStream = new Subject<boolean>();
  return {
    cancel: () => boolStream.next(true),
    resolveOnCancel: boolStream
      .pipe(take(1))
      .toPromise()
      .then(() => {}),
  };
};
