/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Logger } from '../../../../src/core/server';

import { Result, asErr, asOk } from './lib/result_type';
import { TaskManagerConfig } from './config';

import { TaskEventType } from './task_events';
import { Middleware } from './lib/middleware';
import { EphemeralTaskInstance } from './task';
import { TaskPool } from './task_pool';
import { TaskTypeDictionary } from './task_type_dictionary';
import { TaskLifecycleEvent } from './polling_lifecycle';
import { EphemeralTaskManagerRunner } from './task_running/ephemeral_task_runner';

export interface EphemeralTaskLifecycleOpts {
  logger: Logger;
  definitions: TaskTypeDictionary;
  config: TaskManagerConfig;
  middleware: Middleware;
  elasticsearchAndSOAvailability$: Observable<boolean>;
  pool: TaskPool;
  lifecycleEvent: Observable<TaskLifecycleEvent>;
}

type EphemeralTaskInstanceRequest = Omit<EphemeralTaskInstance, 'startedAt'>;

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

    this.lifecycleEvent
      .pipe(
        filter(
          // we want to know when the queue has ephemeral task run requests
          (e) => {
            return (
              this.ephemeralTaskQueue.size > 0 &&
              e.type === TaskEventType.TASK_POLLING_CYCLE &&
              // and when a polling cycle has just completed,
              // (e.type === TaskEventType.TASK_POLLING_CYCLE ||
              //   // or the "load" in the TaskPool has changed (meaning a task has just completed)
              //   (e.type === TaskEventType.TASK_MANAGER_STAT && e.id === 'load')) &&
              this.getCapacity() > 0
            );
          }
        )
      )
      .subscribe(async (e) => {
        let overallCapacity = this.getCapacity();
        const capacityByType = new Map<string, number>();
        this.pool
          .run(
            [...this.ephemeralTaskQueue]
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
              })
          )
          .then((successTaskPoolRunResult) => {
            this.logger.debug(
              `Successful ephemeral task lifecycle resulted in: ${successTaskPoolRunResult}`
            );
          })
          .catch((error) => {
            this.logger.debug(`Failed ephemeral task lifecycle resulted in: ${error}`);
          });
      });
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
    pushIntoSet(this.ephemeralTaskQueue, this.config.request_capacity, task);
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
function pushIntoSet<T>(set: Set<T>, maxCapacity: number, value: T): Result<Set<T>, Set<T>> {
  if (set.size >= maxCapacity) {
    return asErr(set);
  }
  set.add(value);
  return asOk(set);
}
