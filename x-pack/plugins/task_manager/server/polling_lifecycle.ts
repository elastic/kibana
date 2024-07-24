/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, Observable } from 'rxjs';
import { pipe } from 'fp-ts/lib/pipeable';
import { map as mapOptional } from 'fp-ts/lib/Option';
import { tap } from 'rxjs';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { Logger, ExecutionContextStart } from '@kbn/core/server';

import { Result, asErr, mapErr, asOk, map, mapOk } from './lib/result_type';
import { ManagedConfiguration } from './lib/create_managed_configuration';
import { TaskManagerConfig, CLAIM_STRATEGY_DEFAULT } from './config';

import {
  TaskMarkRunning,
  TaskRun,
  TaskClaim,
  TaskRunRequest,
  asTaskRunRequestEvent,
  TaskPollingCycle,
  asTaskPollingCycleEvent,
  TaskManagerStat,
  asTaskManagerStatEvent,
  EphemeralTaskRejectedDueToCapacity,
  TaskManagerMetric,
} from './task_events';
import { fillPool, FillPoolResult, TimedFillPoolResult } from './lib/fill_pool';
import { Middleware } from './lib/middleware';
import { intervalFromNow } from './lib/intervals';
import { ConcreteTaskInstance } from './task';
import { createTaskPoller, PollingError, PollingErrorType } from './polling';
import { TaskPool } from './task_pool';
import { TaskManagerRunner, TaskRunner } from './task_running';
import { TaskStore } from './task_store';
import { identifyEsError, isEsCannotExecuteScriptError } from './lib/identify_es_error';
import { BufferedTaskStore } from './buffered_task_store';
import { TaskTypeDictionary } from './task_type_dictionary';
import { delayOnClaimConflicts } from './polling';
import { TaskClaiming } from './queries/task_claiming';
import { ClaimOwnershipResult } from './task_claimers';
import { TaskPartitioner } from './lib/task_partitioner';

export interface ITaskEventEmitter<T> {
  get events(): Observable<T>;
}

export type TaskPollingLifecycleOpts = {
  logger: Logger;
  definitions: TaskTypeDictionary;
  unusedTypes: string[];
  taskStore: TaskStore;
  config: TaskManagerConfig;
  middleware: Middleware;
  elasticsearchAndSOAvailability$: Observable<boolean>;
  executionContext: ExecutionContextStart;
  usageCounter?: UsageCounter;
  taskPartitioner: TaskPartitioner;
} & ManagedConfiguration;

export type TaskLifecycleEvent =
  | TaskMarkRunning
  | TaskRun
  | TaskClaim
  | TaskRunRequest
  | TaskPollingCycle
  | TaskManagerStat
  | TaskManagerMetric
  | EphemeralTaskRejectedDueToCapacity;

/**
 * The public interface into the task manager system.
 */
export class TaskPollingLifecycle implements ITaskEventEmitter<TaskLifecycleEvent> {
  private definitions: TaskTypeDictionary;

  private store: TaskStore;
  private taskClaiming: TaskClaiming;
  private bufferedStore: BufferedTaskStore;
  private readonly executionContext: ExecutionContextStart;

  private logger: Logger;
  public pool: TaskPool;
  // all task related events (task claimed, task marked as running, etc.) are emitted through events$
  private events$ = new Subject<TaskLifecycleEvent>();

  private middleware: Middleware;

  private usageCounter?: UsageCounter;
  private config: TaskManagerConfig;

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  constructor({
    logger,
    middleware,
    maxWorkersConfiguration$,
    pollIntervalConfiguration$,
    // Elasticsearch and SavedObjects availability status
    elasticsearchAndSOAvailability$,
    config,
    taskStore,
    definitions,
    unusedTypes,
    executionContext,
    usageCounter,
    taskPartitioner,
  }: TaskPollingLifecycleOpts) {
    this.logger = logger;
    this.middleware = middleware;
    this.definitions = definitions;
    this.store = taskStore;
    this.executionContext = executionContext;
    this.usageCounter = usageCounter;
    this.config = config;

    const emitEvent = (event: TaskLifecycleEvent) => this.events$.next(event);

    this.bufferedStore = new BufferedTaskStore(this.store, {
      bufferMaxOperations: config.max_workers,
      logger,
    });

    this.pool = new TaskPool({
      logger,
      maxWorkers$: maxWorkersConfiguration$,
    });
    this.pool.load.subscribe(emitEvent);

    this.taskClaiming = new TaskClaiming({
      taskStore,
      strategy: config.claim_strategy,
      maxAttempts: config.max_attempts,
      excludedTaskTypes: config.unsafe.exclude_task_types,
      definitions,
      unusedTypes,
      logger: this.logger,
      getCapacity: (taskType?: string) =>
        taskType && this.definitions.get(taskType)?.maxConcurrency
          ? Math.max(
              Math.min(
                this.pool.availableWorkers,
                this.definitions.get(taskType)!.maxConcurrency! -
                  this.pool.getOccupiedWorkersByType(taskType)
              ),
              0
            )
          : this.pool.availableWorkers,
      taskPartitioner,
    });
    // pipe taskClaiming events into the lifecycle event stream
    this.taskClaiming.events.subscribe(emitEvent);

    const { poll_interval: pollInterval, claim_strategy: claimStrategy } = config;

    let pollIntervalDelay$: Observable<number> | undefined;
    if (claimStrategy === CLAIM_STRATEGY_DEFAULT) {
      pollIntervalDelay$ = delayOnClaimConflicts(
        maxWorkersConfiguration$,
        pollIntervalConfiguration$,
        this.events$,
        config.version_conflict_threshold,
        config.monitored_stats_running_average_window
      ).pipe(tap((delay) => emitEvent(asTaskManagerStatEvent('pollingDelay', asOk(delay)))));
    }

    const poller = createTaskPoller<string, TimedFillPoolResult>({
      logger,
      initialPollInterval: pollInterval,
      pollInterval$: pollIntervalConfiguration$,
      pollIntervalDelay$,
      getCapacity: () => {
        const capacity = this.pool.availableWorkers;
        if (!capacity) {
          // if there isn't capacity, emit a load event so that we can expose how often
          // high load causes the poller to skip work (work isn't called when there is no capacity)
          this.emitEvent(asTaskManagerStatEvent('load', asOk(this.pool.workerLoad)));

          // Emit event indicating task manager utilization
          this.emitEvent(asTaskManagerStatEvent('workerUtilization', asOk(this.pool.workerLoad)));
        }
        return capacity;
      },
      work: this.pollForWork,
    });
    this.subscribeToPoller(poller.events$);

    elasticsearchAndSOAvailability$.subscribe((areESAndSOAvailable) => {
      if (areESAndSOAvailable) {
        // start polling for work
        poller.start();
      } else if (!areESAndSOAvailable) {
        poller.stop();
        this.pool.cancelRunningTasks();
      }
    });
  }

  public get events(): Observable<TaskLifecycleEvent> {
    return this.events$;
  }

  private emitEvent = (event: TaskLifecycleEvent) => {
    this.events$.next(event);
  };

  private createTaskRunnerForTask = (instance: ConcreteTaskInstance) => {
    return new TaskManagerRunner({
      logger: this.logger,
      instance,
      store: this.bufferedStore,
      definitions: this.definitions,
      beforeRun: this.middleware.beforeRun,
      beforeMarkRunning: this.middleware.beforeMarkRunning,
      onTaskEvent: this.emitEvent,
      defaultMaxAttempts: this.taskClaiming.maxAttempts,
      executionContext: this.executionContext,
      usageCounter: this.usageCounter,
      eventLoopDelayConfig: { ...this.config.event_loop_delay },
      allowReadingInvalidState: this.config.allow_reading_invalid_state,
    });
  };

  private pollForWork = async (): Promise<TimedFillPoolResult> => {
    return fillPool(
      // claim available tasks
      () => {
        return claimAvailableTasks(this.taskClaiming, this.logger).pipe(
          tap(
            mapOk(({ timing }: ClaimOwnershipResult) => {
              if (timing) {
                this.emitEvent(
                  asTaskManagerStatEvent('claimDuration', asOk(timing.stop - timing.start))
                );
              }
            })
          )
        );
      },
      // wrap each task in a Task Runner
      this.createTaskRunnerForTask,
      // place tasks in the Task Pool
      async (tasks: TaskRunner[]) => {
        const tasksToRun = [];
        const removeTaskPromises = [];
        for (const task of tasks) {
          if (task.isAdHocTaskAndOutOfAttempts) {
            this.logger.debug(`Removing ${task} because the max attempts have been reached.`);
            removeTaskPromises.push(task.removeTask());
          } else {
            tasksToRun.push(task);
          }
        }
        // Wait for all the promises at once to speed up the polling cycle
        const [result] = await Promise.all([this.pool.run(tasksToRun), ...removeTaskPromises]);
        // Emit the load after fetching tasks, giving us a good metric for evaluating how
        // busy Task manager tends to be in this Kibana instance
        this.emitEvent(asTaskManagerStatEvent('load', asOk(this.pool.workerLoad)));
        return result;
      }
    );
  };

  private subscribeToPoller(
    poller$: Observable<Result<TimedFillPoolResult, PollingError<string>>>
  ) {
    return poller$
      .pipe(
        tap(
          mapErr((error: PollingError<string>) => {
            if (error.type === PollingErrorType.RequestCapacityReached) {
              pipe(
                error.data,
                mapOptional((id) => this.emitEvent(asTaskRunRequestEvent(id, asErr(error))))
              );
            }
            this.logger.error(error.message);

            // Emit event indicating task manager utilization % at the end of a polling cycle
            // Because there was a polling error, no tasks were claimed so this represents the number of workers busy
            this.emitEvent(asTaskManagerStatEvent('workerUtilization', asOk(this.pool.workerLoad)));
          })
        )
      )
      .pipe(
        tap(
          mapOk(() => {
            // Emit event indicating task manager utilization % at the end of a polling cycle
            // This represents the number of workers busy + number of tasks claimed in this cycle
            this.emitEvent(asTaskManagerStatEvent('workerUtilization', asOk(this.pool.workerLoad)));
          })
        )
      )
      .subscribe((result: Result<TimedFillPoolResult, PollingError<string>>) => {
        this.emitEvent(
          map(
            result,
            ({ timing, ...event }) => asTaskPollingCycleEvent<string>(asOk(event), timing),
            (event) => asTaskPollingCycleEvent<string>(asErr(event))
          )
        );
      });
  }
}

export function claimAvailableTasks(
  taskClaiming: TaskClaiming,
  logger: Logger
): Observable<Result<ClaimOwnershipResult, FillPoolResult>> {
  return new Observable((observer) => {
    taskClaiming
      .claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: intervalFromNow('30s')!,
      })
      .subscribe(
        (claimResult) => {
          observer.next(claimResult);
        },
        (ex) => {
          // if the `taskClaiming` stream errors out we want to catch it and see if
          // we can identify the reason
          // if we can - we emit an FillPoolResult error rather than erroring out the wrapping Observable
          // returned by `claimAvailableTasks`
          if (isEsCannotExecuteScriptError(ex)) {
            logger.warn(
              `Task Manager cannot operate when inline scripts are disabled in Elasticsearch`
            );
            observer.next(asErr(FillPoolResult.Failed));
            observer.complete();
          } else {
            const esError = identifyEsError(ex);
            // as we could't identify the reason - we'll error out the wrapping Observable too
            observer.error(esError.length > 0 ? esError : ex);
          }
        },
        () => {
          observer.complete();
        }
      );
  });
}
