/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, Observable, Subscription } from 'rxjs';
import { pipe } from 'fp-ts/lib/pipeable';
import { Option, some, map as mapOptional } from 'fp-ts/lib/Option';
import { tap } from 'rxjs/operators';
import { UsageCounter } from '../../../../src/plugins/usage_collection/server';
import type { Logger, ExecutionContextStart } from '../../../../src/core/server';

import { Result, asErr, mapErr, asOk, map, mapOk } from './lib/result_type';
import { ManagedConfiguration } from './lib/create_managed_configuration';
import { TaskManagerConfig } from './config';

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
} from './task_events';
import { fillPool, FillPoolResult, TimedFillPoolResult } from './lib/fill_pool';
import { Middleware } from './lib/middleware';
import { intervalFromNow } from './lib/intervals';
import { ConcreteTaskInstance } from './task';
import {
  createTaskPoller,
  PollingError,
  PollingErrorType,
  createObservableMonitor,
} from './polling';
import { TaskPool } from './task_pool';
import { TaskManagerRunner, TaskRunner } from './task_running';
import { TaskStore } from './task_store';
import { identifyEsError, isEsCannotExecuteScriptError } from './lib/identify_es_error';
import { BufferedTaskStore } from './buffered_task_store';
import { TaskTypeDictionary } from './task_type_dictionary';
import { delayOnClaimConflicts } from './polling';
import { TaskClaiming, ClaimOwnershipResult } from './queries/task_claiming';

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
} & ManagedConfiguration;

export type TaskLifecycleEvent =
  | TaskMarkRunning
  | TaskRun
  | TaskClaim
  | TaskRunRequest
  | TaskPollingCycle
  | TaskManagerStat
  | EphemeralTaskRejectedDueToCapacity;

/**
 * The public interface into the task manager system.
 */
export class TaskPollingLifecycle {
  private definitions: TaskTypeDictionary;

  private store: TaskStore;
  private taskClaiming: TaskClaiming;
  private bufferedStore: BufferedTaskStore;
  private readonly executionContext: ExecutionContextStart;

  private logger: Logger;
  public pool: TaskPool;
  // all task related events (task claimed, task marked as running, etc.) are emitted through events$
  private events$ = new Subject<TaskLifecycleEvent>();
  // all on-demand requests we wish to pipe into the poller
  private claimRequests$ = new Subject<Option<string>>();
  // our subscription to the poller
  private pollingSubscription: Subscription = Subscription.EMPTY;

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
    });
    // pipe taskClaiming events into the lifecycle event stream
    this.taskClaiming.events.subscribe(emitEvent);

    const { max_poll_inactivity_cycles: maxPollInactivityCycles, poll_interval: pollInterval } =
      config;

    const pollIntervalDelay$ = delayOnClaimConflicts(
      maxWorkersConfiguration$,
      pollIntervalConfiguration$,
      this.events$,
      config.version_conflict_threshold,
      config.monitored_stats_running_average_window
    ).pipe(tap((delay) => emitEvent(asTaskManagerStatEvent('pollingDelay', asOk(delay)))));

    // the task poller that polls for work on fixed intervals and on demand
    const poller$: Observable<Result<TimedFillPoolResult, PollingError<string>>> =
      createObservableMonitor<Result<TimedFillPoolResult, PollingError<string>>, Error>(
        () =>
          createTaskPoller<string, TimedFillPoolResult>({
            logger,
            pollInterval$: pollIntervalConfiguration$,
            pollIntervalDelay$,
            bufferCapacity: config.request_capacity,
            getCapacity: () => {
              const capacity = this.pool.availableWorkers;
              if (!capacity) {
                // if there isn't capacity, emit a load event so that we can expose how often
                // high load causes the poller to skip work (work isn'tcalled when there is no capacity)
                this.emitEvent(asTaskManagerStatEvent('load', asOk(this.pool.workerLoad)));
              }
              return capacity;
            },
            pollRequests$: this.claimRequests$,
            work: this.pollForWork,
            // Time out the `work` phase if it takes longer than a certain number of polling cycles
            // The `work` phase includes the prework needed *before* executing a task
            // (such as polling for new work, marking tasks as running etc.) but does not
            // include the time of actually running the task
            workTimeout: pollInterval * maxPollInactivityCycles,
          }),
        {
          heartbeatInterval: pollInterval,
          // Time out the poller itself if it has failed to complete the entire stream for a certain amount of time.
          // This is different that the `work` timeout above, as the poller could enter an invalid state where
          // it fails to complete a cycle even thought `work` is completing quickly.
          // We grant it a single cycle longer than the time alotted to `work` so that timing out the `work`
          // doesn't get short circuited by the monitor reinstantiating the poller all together (a far more expensive
          // operation than just timing out the `work` internally)
          inactivityTimeout: pollInterval * (maxPollInactivityCycles + 1),
          onError: (error) => {
            logger.error(`[Task Poller Monitor]: ${error.message}`);
          },
        }
      );

    elasticsearchAndSOAvailability$.subscribe((areESAndSOAvailable) => {
      if (areESAndSOAvailable && !this.isStarted) {
        // start polling for work
        this.pollingSubscription = this.subscribeToPoller(poller$);
      } else if (!areESAndSOAvailable && this.isStarted) {
        this.pollingSubscription.unsubscribe();
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

  public attemptToRun(task: string) {
    this.claimRequests$.next(some(task));
  }

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
    });
  };

  public get isStarted() {
    return !this.pollingSubscription.closed;
  }

  private pollForWork = async (...tasksToClaim: string[]): Promise<TimedFillPoolResult> => {
    return fillPool(
      // claim available tasks
      () => {
        return claimAvailableTasks(
          tasksToClaim.splice(0, this.pool.availableWorkers),
          this.taskClaiming,
          this.logger
        ).pipe(
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
        const result = await this.pool.run(tasks);
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
  claimTasksById: string[],
  taskClaiming: TaskClaiming,
  logger: Logger
): Observable<Result<ClaimOwnershipResult, FillPoolResult>> {
  return new Observable((observer) => {
    taskClaiming
      .claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: intervalFromNow('30s')!,
        claimTasksById,
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
