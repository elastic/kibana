/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Subject, Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { performance } from 'perf_hooks';

import { pipe } from 'fp-ts/lib/pipeable';
import { Option, some, map as mapOptional, getOrElse } from 'fp-ts/lib/Option';

import {
  SavedObjectsSerializer,
  ILegacyScopedClusterClient,
  ISavedObjectsRepository,
} from '../../../../src/core/server';
import { Result, asOk, asErr, either, map, mapErr, promiseResult } from './lib/result_type';
import { TaskManagerConfig } from './config';

import { Logger } from './types';
import {
  TaskMarkRunning,
  TaskRun,
  TaskClaim,
  TaskRunRequest,
  isTaskRunEvent,
  isTaskClaimEvent,
  isTaskRunRequestEvent,
  asTaskRunRequestEvent,
} from './task_events';
import { fillPool, FillPoolResult } from './lib/fill_pool';
import { addMiddlewareToChain, BeforeSaveMiddlewareParams, Middleware } from './lib/middleware';
import { sanitizeTaskDefinitions } from './lib/sanitize_task_definitions';
import { intervalFromNow } from './lib/intervals';
import {
  TaskDefinition,
  TaskDictionary,
  ConcreteTaskInstance,
  RunContext,
  TaskInstanceWithId,
  TaskInstanceWithDeprecatedFields,
  TaskLifecycle,
  TaskLifecycleResult,
  TaskStatus,
  ElasticJs,
} from './task';
import {
  createTaskPoller,
  PollingError,
  PollingErrorType,
  createObservableMonitor,
} from './polling';
import { TaskPool } from './task_pool';
import { TaskManagerRunner, TaskRunner } from './task_runner';
import {
  FetchResult,
  TaskStore,
  OwnershipClaimingOpts,
  ClaimOwnershipResult,
  SearchOpts,
} from './task_store';
import { identifyEsError } from './lib/identify_es_error';
import { ensureDeprecatedFieldsAreCorrected } from './lib/correct_deprecated_fields';
import { BufferedTaskStore } from './buffered_task_store';

const VERSION_CONFLICT_STATUS = 409;

export interface TaskManagerOpts {
  logger: Logger;
  config: TaskManagerConfig;
  callAsInternalUser: ILegacyScopedClusterClient['callAsInternalUser'];
  savedObjectsRepository: ISavedObjectsRepository;
  serializer: SavedObjectsSerializer;
  taskManagerId: string;
}

interface RunNowResult {
  id: string;
}

export type TaskLifecycleEvent = TaskMarkRunning | TaskRun | TaskClaim | TaskRunRequest;

/*
 * The TaskManager is the public interface into the task manager system. This glues together
 * all of the disparate modules in one integration point. The task manager operates in two different ways:
 *
 * - pre-init, it allows middleware registration, but disallows task manipulation
 * - post-init, it disallows middleware registration, but allows task manipulation
 *
 * Due to its complexity, this is mostly tested by integration tests (see readme).
 */

/**
 * The public interface into the task manager system.
 */
export class TaskManager {
  private definitions: TaskDictionary<TaskDefinition> = {};

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

  private startQueue: Array<() => void> = [];
  private middleware = {
    beforeSave: async (saveOpts: BeforeSaveMiddlewareParams) => saveOpts,
    beforeRun: async (runOpts: RunContext) => runOpts,
    beforeMarkRunning: async (runOpts: RunContext) => runOpts,
  };

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  constructor(opts: TaskManagerOpts) {
    this.logger = opts.logger;

    const { taskManagerId } = opts;
    if (!taskManagerId) {
      this.logger.error(
        `TaskManager is unable to start as there the Kibana UUID is invalid (value of the "server.uuid" configuration is ${taskManagerId})`
      );
      throw new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`);
    } else {
      this.logger.info(`TaskManager is identified by the Kibana UUID: ${taskManagerId}`);
    }

    this.store = new TaskStore({
      serializer: opts.serializer,
      savedObjectsRepository: opts.savedObjectsRepository,
      callCluster: (opts.callAsInternalUser as unknown) as ElasticJs,
      index: opts.config.index,
      maxAttempts: opts.config.max_attempts,
      definitions: this.definitions,
      taskManagerId: `kibana:${taskManagerId}`,
    });
    // pipe store events into the TaskManager's event stream
    this.store.events.subscribe((event) => this.events$.next(event));

    this.bufferedStore = new BufferedTaskStore(this.store, {
      bufferMaxOperations: opts.config.max_workers,
      logger: this.logger,
    });

    this.pool = new TaskPool({
      logger: this.logger,
      maxWorkers: opts.config.max_workers,
    });

    const {
      max_poll_inactivity_cycles: maxPollInactivityCycles,
      poll_interval: pollInterval,
    } = opts.config;
    this.poller$ = createObservableMonitor<Result<FillPoolResult, PollingError<string>>, Error>(
      () =>
        createTaskPoller<string, FillPoolResult>({
          pollInterval,
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

  private emitEvent = (event: TaskLifecycleEvent) => {
    this.events$.next(event);
  };

  private attemptToRun(task: string) {
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
      // Some calls are waiting until task manager is started
      this.startQueue.forEach((fn) => fn());
      this.startQueue = [];

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

  private async waitUntilStarted() {
    if (!this.isStarted) {
      await new Promise((resolve) => {
        this.startQueue.push(resolve);
      });
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

  /**
   * Method for allowing consumers to register task definitions into the system.
   * @param taskDefinitions - The Kibana task definitions dictionary
   */
  public registerTaskDefinitions(taskDefinitions: TaskDictionary<TaskDefinition>) {
    this.assertUninitialized('register task definitions', Object.keys(taskDefinitions).join(', '));
    const duplicate = Object.keys(taskDefinitions).find((k) => !!this.definitions[k]);
    if (duplicate) {
      throw new Error(`Task ${duplicate} is already defined!`);
    }

    try {
      const sanitized = sanitizeTaskDefinitions(taskDefinitions);

      Object.assign(this.definitions, sanitized);
    } catch (e) {
      this.logger.error('Could not sanitize task definitions');
    }
  }

  /**
   * Adds middleware to the task manager, such as adding security layers, loggers, etc.
   *
   * @param {Middleware} middleware - The middlware being added.
   */
  public addMiddleware(middleware: Middleware) {
    this.assertUninitialized('add middleware');
    const prevMiddleWare = this.middleware;
    this.middleware = addMiddlewareToChain(prevMiddleWare, middleware);
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
    await this.waitUntilStarted();
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...options,
      taskInstance: ensureDeprecatedFieldsAreCorrected(taskInstance, this.logger),
    });
    return await this.store.schedule(modifiedTask);
  }

  /**
   * Run  task.
   *
   * @param taskId - The task being scheduled.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  public async runNow(taskId: string): Promise<RunNowResult> {
    await this.waitUntilStarted();
    return new Promise(async (resolve, reject) => {
      awaitTaskRunResult(taskId, this.events$, this.store.getLifecycle.bind(this.store))
        .then(resolve)
        .catch(reject);

      this.attemptToRun(taskId);
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

  /**
   * Fetches a list of scheduled tasks.
   *
   * @param opts - The query options used to filter tasks
   * @returns {Promise<FetchResult>}
   */
  public async fetch(opts: SearchOpts): Promise<FetchResult> {
    await this.waitUntilStarted();
    return this.store.fetch(opts);
  }

  /**
   * Get the current state of a specified task.
   *
   * @param {string} id
   * @returns {Promise<RemoveResult>}
   */
  public async get(id: string): Promise<ConcreteTaskInstance> {
    await this.waitUntilStarted();
    return this.store.get(id);
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<RemoveResult>}
   */
  public async remove(id: string): Promise<void> {
    await this.waitUntilStarted();
    return this.store.remove(id);
  }

  /**
   * Ensures task manager IS NOT already initialized
   *
   * @param {string} message shown if task manager is already initialized
   * @returns void
   */
  private assertUninitialized(message: string, context?: string) {
    if (this.isStarted) {
      throw new Error(
        `${context ? `[${context}] ` : ''}Cannot ${message} after the task manager is initialized`
      );
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

export async function awaitTaskRunResult(
  taskId: string,
  events$: Subject<TaskLifecycleEvent>,
  getLifecycle: (id: string) => Promise<TaskLifecycle>
): Promise<RunNowResult> {
  return new Promise((resolve, reject) => {
    const subscription = events$
      // listen for all events related to the current task
      .pipe(filter(({ id }: TaskLifecycleEvent) => id === taskId))
      .subscribe((taskEvent: TaskLifecycleEvent) => {
        if (isTaskClaimEvent(taskEvent)) {
          mapErr(async (error: Option<ConcreteTaskInstance>) => {
            // reject if any error event takes place for the requested task
            subscription.unsubscribe();
            return reject(
              map(
                await pipe(
                  error,
                  mapOptional(async (taskReturnedBySweep) => asOk(taskReturnedBySweep.status)),
                  getOrElse(() =>
                    // if the error happened in the Claim phase - we try to provide better insight
                    // into why we failed to claim by getting the task's current lifecycle status
                    promiseResult<TaskLifecycle, Error>(getLifecycle(taskId))
                  )
                ),
                (taskLifecycleStatus: TaskLifecycle) => {
                  if (taskLifecycleStatus === TaskLifecycleResult.NotFound) {
                    return new Error(`Failed to run task "${taskId}" as it does not exist`);
                  } else if (
                    taskLifecycleStatus === TaskStatus.Running ||
                    taskLifecycleStatus === TaskStatus.Claiming
                  ) {
                    return new Error(`Failed to run task "${taskId}" as it is currently running`);
                  }
                  return new Error(
                    `Failed to run task "${taskId}" for unknown reason (Current Task Lifecycle is "${taskLifecycleStatus}")`
                  );
                },
                (getLifecycleError: Error) =>
                  new Error(
                    `Failed to run task "${taskId}" and failed to get current Status:${getLifecycleError}`
                  )
              )
            );
          }, taskEvent.event);
        } else {
          either<ConcreteTaskInstance, Error | Option<ConcreteTaskInstance>>(
            taskEvent.event,
            (taskInstance: ConcreteTaskInstance) => {
              // resolve if the task has run sucessfully
              if (isTaskRunEvent(taskEvent)) {
                subscription.unsubscribe();
                resolve({ id: taskInstance.id });
              }
            },
            async (error: Error | Option<ConcreteTaskInstance>) => {
              // reject if any error event takes place for the requested task
              subscription.unsubscribe();
              if (isTaskRunRequestEvent(taskEvent)) {
                return reject(
                  new Error(
                    `Failed to run task "${taskId}" as Task Manager is at capacity, please try again later`
                  )
                );
              }
              return reject(new Error(`Failed to run task "${taskId}": ${error}`));
            }
          );
        }
      });
  });
}
