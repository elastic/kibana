/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Logger, ExecutionContextStart } from '@kbn/core/server';

import { Result, asErr, asOk } from './lib/result_type';
import { TaskManagerConfig } from './config';

import { asTaskManagerStatEvent, isTaskRunEvent, isTaskPollingCycleEvent } from './task_events';
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
  executionContext: ExecutionContextStart;
}

export type EphemeralTaskInstanceRequest = Omit<EphemeralTaskInstance, 'startedAt'>;

export class EphemeralTaskLifecycle {
  private definitions: TaskTypeDictionary;
  private pool: TaskPool;
  private lifecycleEvent: Observable<TaskLifecycleEvent>;
  // all task related events (task claimed, task marked as running, etc.) are emitted through events$
  private events$ = new Subject<TaskLifecycleEvent>();
  private ephemeralTaskQueue: Array<{
    task: EphemeralTaskInstanceRequest;
    enqueuedAt: number;
  }> = [];
  private logger: Logger;
  private config: TaskManagerConfig;
  private middleware: Middleware;
  private lifecycleSubscription: Subscription = Subscription.EMPTY;
  private readonly executionContext: ExecutionContextStart;

  constructor({
    logger,
    middleware,
    definitions,
    pool,
    lifecycleEvent,
    config,
    executionContext,
  }: EphemeralTaskLifecycleOpts) {
    this.logger = logger;
    this.middleware = middleware;
    this.definitions = definitions;
    this.pool = pool;
    this.lifecycleEvent = lifecycleEvent;
    this.config = config;
    this.executionContext = executionContext;

    if (this.enabled) {
      this.lifecycleSubscription = this.lifecycleEvent
        .pipe(
          filter((e) => {
            const hasPollingCycleCompleted = isTaskPollingCycleEvent(e);
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
            .filter(({ task }) => {
              if (overallCapacity > 0) {
                if (!capacityByType.has(task.taskType)) {
                  capacityByType.set(task.taskType, this.getCapacity(task.taskType));
                }
                if (capacityByType.get(task.taskType)! > 0) {
                  overallCapacity--;
                  capacityByType.set(task.taskType, capacityByType.get(task.taskType)! - 1);
                  return true;
                }
              }
            })
            .map((ephemeralTask) => {
              const index = this.ephemeralTaskQueue.indexOf(ephemeralTask);
              if (index >= 0) {
                this.ephemeralTaskQueue.splice(index, 1);
              }
              this.emitEvent(
                asTaskManagerStatEvent(
                  'ephemeralTaskDelay',
                  asOk(Date.now() - ephemeralTask.enqueuedAt)
                )
              );
              return this.createTaskRunnerForTask(ephemeralTask.task);
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
    return pushIntoSetWithTimestamp(
      this.ephemeralTaskQueue,
      this.config.ephemeral_tasks.request_capacity,
      task
    );
  }

  public get queuedTasks() {
    return this.ephemeralTaskQueue.length;
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
      executionContext: this.executionContext,
    });
  };
}

/**
 * Pushes values into a bounded set
 * @param set A Set of generic type T
 * @param maxCapacity How many values are we allowed to push into the set
 * @param value A value T to push into the set if it is there
 */
function pushIntoSetWithTimestamp(
  set: Array<{
    task: EphemeralTaskInstanceRequest;
    enqueuedAt: number;
  }>,
  maxCapacity: number,
  task: EphemeralTaskInstanceRequest
): Result<EphemeralTaskInstanceRequest, EphemeralTaskInstanceRequest> {
  if (set.length >= maxCapacity) {
    return asErr(task);
  }
  set.push({ task, enqueuedAt: Date.now() });
  return asOk(task);
}
