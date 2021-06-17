/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, Observable, Subscription } from 'rxjs';
import { filter, tap } from 'rxjs/operators';
import { Logger } from '../../../../src/core/server';

import { Result, asErr, asOk } from './lib/result_type';
import { TaskManagerConfig } from './config';

import {
  asTaskManagerStatEvent,
  isTaskRunEvent,
  TaskEventType,
  TaskPollingCycle,
} from './task_events';
import { Middleware } from './lib/middleware';
import { EphemeralTaskInstance } from './task';
import { TaskTypeDictionary } from './task_type_dictionary';
import { TaskLifecycleEvent } from './polling_lifecycle';
import { EphemeralTaskManagerRunner } from './task_running/ephemeral_task_runner';
import { TaskPool } from './task_pool';

export interface EphemeralTaskLifecycleOpts {
  logger: Logger;
  definitions: TaskTypeDictionary;
  config: TaskManagerConfig;
  middleware: Middleware;
  elasticsearchAndSOAvailability$: Observable<boolean>;
  pool: TaskPool;
  lifecycleEvent: Observable<TaskLifecycleEvent>;
}

export type EphemeralTaskInstanceRequest = Omit<EphemeralTaskInstance, 'startedAt'>;

/**
 * The public interface into the task manager system.
 */
export class EphemeralTaskLifecycle {
  private definitions: TaskTypeDictionary;
  private pool: TaskPool;
  private lifecycleEvent: Observable<TaskLifecycleEvent>;
  // all task related events (task claimed, task marked as running, etc.) are emitted through events$
  private events$ = new Subject<TaskLifecycleEvent>();
  private ephemeralTaskQueue = new Set<EphemeralTaskInstanceRequest>();
  private logger: Logger;
  private config: TaskManagerConfig;
  private middleware: Middleware;
  private lifecycleSubscription: Subscription = Subscription.EMPTY;

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  constructor({
    logger,
    middleware,
    definitions,
    pool,
    lifecycleEvent,
    config,
  }: EphemeralTaskLifecycleOpts) {
    this.logger = logger;
    this.middleware = middleware;
    this.definitions = definitions;
    this.pool = pool;
    this.lifecycleEvent = lifecycleEvent;
    this.config = config;

    if (this.enabled) {
      this.lifecycleSubscription = this.lifecycleEvent
        .pipe(
          filter((e) => {
            const hasPollingCycleCompleted = isPollingCycleCompletedEvent(e);
            if (hasPollingCycleCompleted) {
              this.emitEvent(
                asTaskManagerStatEvent('queuedEphemeralTasks', asOk(this.queuedTasks))
              );
            }
            return (
              // when a polling cycle or a task run have just completed
              (hasPollingCycleCompleted || isTaskRunEvent(e)) &&
              // we want to know when the queue has ephemeral task run requests
              this.queuedTasks > 0 &&
              this.getCapacity() > 0
            );
          })
        )
        .subscribe(async (e) => {
          let overallCapacity = this.getCapacity();
          const capacityByType = new Map<string, number>();
          const tasksWithinCapacity = [...this.ephemeralTaskQueue]
            .filter((ephemeralTask) => {
              if (overallCapacity > 0) {
                if (!capacityByType.has(ephemeralTask.taskType)) {
                  capacityByType.set(
                    ephemeralTask.taskType,
                    this.getCapacity(ephemeralTask.taskType)
                  );
                }
                if (capacityByType.get(ephemeralTask.taskType)! > 0) {
                  overallCapacity--;
                  capacityByType.set(
                    ephemeralTask.taskType,
                    capacityByType.get(ephemeralTask.taskType)! - 1
                  );
                  return true;
                }
              }
            })
            .map((taskToRun) => {
              this.ephemeralTaskQueue.delete(taskToRun);
              return this.createTaskRunnerForTask(taskToRun);
            });

          if (tasksWithinCapacity.length) {
            this.pool
              .run(tasksWithinCapacity)
              .then((successTaskPoolRunResult) => {
                this.logger.debug(
                  `Successful ephemeral task lifecycle resulted in: ${successTaskPoolRunResult}`
                );
              })
              .catch((error) => {
                this.logger.debug(`Failed ephemeral task lifecycle resulted in: ${error}`);
              });
          }
        });
    }
  }

  public get enabled(): boolean {
    return this.config.ephemeral_tasks.enabled;
  }

  public get events(): Observable<TaskLifecycleEvent> {
    return this.events$;
  }

  private getCapacity = (taskType?: string) =>
    taskType && this.definitions.get(taskType)?.maxConcurrency
      ? Math.max(
          Math.min(
            this.pool.availableWorkers,
            this.definitions.get(taskType)!.maxConcurrency! -
              this.pool.getOccupiedWorkersByType(taskType)
          ),
          0
        )
      : this.pool.availableWorkers;

  private emitEvent = (event: TaskLifecycleEvent) => {
    this.events$.next(event);
  };

  public attemptToRun(task: EphemeralTaskInstanceRequest) {
    if (this.lifecycleSubscription.closed) {
      return asErr(task);
    }
    return pushIntoSet(this.ephemeralTaskQueue, this.config.request_capacity, task);
  }

  public get queuedTasks() {
    return this.ephemeralTaskQueue.size;
  }

  private createTaskRunnerForTask = (
    instance: EphemeralTaskInstanceRequest
  ): EphemeralTaskManagerRunner => {
    return new EphemeralTaskManagerRunner({
      logger: this.logger,
      instance: {
        ...instance,
        startedAt: new Date(),
      },
      definitions: this.definitions,
      beforeRun: this.middleware.beforeRun,
      beforeMarkRunning: this.middleware.beforeMarkRunning,
      onTaskEvent: this.emitEvent,
    });
  };
}

/**
 * Pushes values into a bounded set
 * @param set A Set of generic type T
 * @param maxCapacity How many values are we allowed to push into the set
 * @param value A value T to push into the set if it is there
 */
function pushIntoSet<T>(set: Set<T>, maxCapacity: number, value: T): Result<T, T> {
  if (set.size >= maxCapacity) {
    return asErr(value);
  }
  set.add(value);
  return asOk(value);
}

function isPollingCycleCompletedEvent(e: TaskLifecycleEvent): e is TaskPollingCycle {
  return e.type === TaskEventType.TASK_POLLING_CYCLE;
}
