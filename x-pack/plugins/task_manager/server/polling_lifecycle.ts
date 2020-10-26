/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Subject, Observable, Subscription } from 'rxjs';

import { performance } from 'perf_hooks';

import { pipe } from 'fp-ts/lib/pipeable';
import { Option, some, map as mapOptional } from 'fp-ts/lib/Option';
import { Logger } from '../../../../src/core/server';

import { Result, asErr, mapErr } from './lib/result_type';
import { ManagedConfiguration } from './lib/create_managed_configuration';
import { TaskManagerConfig } from './config';

import {
  TaskMarkRunning,
  TaskRun,
  TaskClaim,
  TaskRunRequest,
  asTaskRunRequestEvent,
} from './task_events';
import { fillPool, FillPoolResult } from './lib/fill_pool';
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
import { TaskManagerRunner, TaskRunner } from './task_runner';
import { TaskStore, OwnershipClaimingOpts, ClaimOwnershipResult } from './task_store';
import { identifyEsError } from './lib/identify_es_error';
import { BufferedTaskStore } from './buffered_task_store';
import { TaskTypeDictionary } from './task_type_dictionary';

export type TaskPollingLifecycleOpts = {
  logger: Logger;
  definitions: TaskTypeDictionary;
  taskStore: TaskStore;
  config: TaskManagerConfig;
  middleware: Middleware;
} & ManagedConfiguration;

export type TaskLifecycleEvent = TaskMarkRunning | TaskRun | TaskClaim | TaskRunRequest;

/**
 * The public interface into the task manager system.
 */
export class TaskPollingLifecycle {
  private definitions: TaskTypeDictionary;

  private store: TaskStore;
  private bufferedStore: BufferedTaskStore;

  private logger: Logger;
  private pool: TaskPool;
  // all task related events (task claimed, task marked as running, etc.) are emitted through events$
  private events$ = new Subject<TaskLifecycleEvent>();
  // all on-demand requests we wish to pipe into the poller
  private claimRequests$ = new Subject<Option<string>>();
  // the task poller that polls for work on fixed intervals and on demand
  private poller$: Observable<Result<FillPoolResult, PollingError<string>>>;
  // our subscription to the poller
  private pollingSubscription: Subscription = Subscription.EMPTY;

  private middleware: Middleware;

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  constructor(opts: TaskPollingLifecycleOpts) {
    const { logger, middleware, maxWorkersConfiguration$, pollIntervalConfiguration$ } = opts;
    this.logger = logger;
    this.middleware = middleware;

    this.definitions = opts.definitions;
    this.store = opts.taskStore;
    // pipe store events into the lifecycle event stream
    this.store.events.subscribe((event) => this.events$.next(event));

    this.bufferedStore = new BufferedTaskStore(this.store, {
      bufferMaxOperations: opts.config.max_workers,
      logger: this.logger,
    });

    this.pool = new TaskPool({
      logger: this.logger,
      maxWorkers$: maxWorkersConfiguration$,
    });

    const {
      max_poll_inactivity_cycles: maxPollInactivityCycles,
      poll_interval: pollInterval,
    } = opts.config;
    this.poller$ = createObservableMonitor<Result<FillPoolResult, PollingError<string>>, Error>(
      () =>
        createTaskPoller<string, FillPoolResult>({
          logger: this.logger,
          pollInterval$: pollIntervalConfiguration$,
          bufferCapacity: opts.config.request_capacity,
          getCapacity: () => this.pool.availableWorkers,
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
          this.logger.error(`[Task Poller Monitor]: ${error.message}`);
        },
      }
    );
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
    });
  };

  public get isStarted() {
    return !this.pollingSubscription.closed;
  }

  private pollForWork = async (...tasksToClaim: string[]): Promise<FillPoolResult> => {
    return fillPool(
      // claim available tasks
      () =>
        claimAvailableTasks(
          tasksToClaim.splice(0, this.pool.availableWorkers),
          this.store.claimAvailableTasks,
          this.pool.availableWorkers,
          this.logger
        ),
      // wrap each task in a Task Runner
      this.createTaskRunnerForTask,
      // place tasks in the Task Pool
      async (tasks: TaskRunner[]) => await this.pool.run(tasks)
    );
  };

  /**
   * Starts up the task manager and starts picking up tasks.
   */
  public start() {
    if (!this.isStarted) {
      this.pollingSubscription = this.poller$.subscribe(
        mapErr((error: PollingError<string>) => {
          if (error.type === PollingErrorType.RequestCapacityReached) {
            pipe(
              error.data,
              mapOptional((id) => this.emitEvent(asTaskRunRequestEvent(id, asErr(error))))
            );
          }
          this.logger.error(error.message);
        })
      );
    }
  }

  /**
   * Stops the task manager and cancels running tasks.
   */
  public stop() {
    if (this.isStarted) {
      this.pollingSubscription.unsubscribe();
      this.pool.cancelRunningTasks();
    }
  }
}

export async function claimAvailableTasks(
  claimTasksById: string[],
  claim: (opts: OwnershipClaimingOpts) => Promise<ClaimOwnershipResult>,
  availableWorkers: number,
  logger: Logger
) {
  if (availableWorkers > 0) {
    performance.mark('claimAvailableTasks_start');

    try {
      const { docs, claimedTasks } = await claim({
        size: availableWorkers,
        claimOwnershipUntil: intervalFromNow('30s')!,
        claimTasksById,
      });

      if (claimedTasks === 0) {
        performance.mark('claimAvailableTasks.noTasks');
      }
      performance.mark('claimAvailableTasks_stop');
      performance.measure(
        'claimAvailableTasks',
        'claimAvailableTasks_start',
        'claimAvailableTasks_stop'
      );

      if (docs.length !== claimedTasks) {
        logger.warn(
          `[Task Ownership error]: ${claimedTasks} tasks were claimed by Kibana, but ${
            docs.length
          } task(s) were fetched (${docs.map((doc) => doc.id).join(', ')})`
        );
      }
      return docs;
    } catch (ex) {
      if (identifyEsError(ex).includes('cannot execute [inline] scripts')) {
        logger.warn(
          `Task Manager cannot operate when inline scripts are disabled in Elasticsearch`
        );
      } else {
        throw ex;
      }
    }
  } else {
    performance.mark('claimAvailableTasks.noAvailableWorkers');
    logger.debug(
      `[Task Ownership]: Task Manager has skipped Claiming Ownership of available tasks at it has ran out Available Workers.`
    );
  }
  return [];
}
