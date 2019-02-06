/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fillPool } from './lib/fill_pool';
import { Logger, TaskManagerLogger } from './lib/logger';
import { addMiddlewareToChain, BeforeSaveMiddlewareParams, Middleware } from './lib/middleware';
import { sanitizeTaskDefinitions } from './lib/sanitize_task_definitions';
import { ConcreteTaskInstance, RunContext, TaskInstance } from './task';
import { SanitizedTaskDefinition, TaskDefinition, TaskDictionary } from './task';
import { TaskPoller } from './task_poller';
import { TaskPool } from './task_pool';
import { TaskManagerRunner } from './task_runner';
import { FetchOpts, FetchResult, RemoveResult, TaskStore } from './task_store';

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
  private isInitialized = false;
  private maxWorkers: number;
  private overrideNumWorkers: { [taskType: string]: number };
  private definitions: TaskDictionary<SanitizedTaskDefinition>;
  private store: TaskStore;
  private poller: TaskPoller;
  private logger: Logger;
  private middleware = {
    beforeSave: async (saveOpts: BeforeSaveMiddlewareParams) => saveOpts,
    beforeRun: async (runOpts: RunContext) => runOpts,
  };

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  public constructor(kbnServer: any, server: any, config: any) {
    this.maxWorkers = config.get('xpack.task_manager.max_workers');
    this.overrideNumWorkers = config.get('xpack.task_manager.override_num_workers');
    this.definitions = {};

    const logger = new TaskManagerLogger((...args: any[]) => server.log(...args));

    /* Kibana UUID needs to be pulled live (not cached), as it takes a long time
     * to initialize, and can change after startup */
    const store = new TaskStore({
      callCluster: server.plugins.elasticsearch.getCluster('admin').callWithInternalUser,
      index: config.get('xpack.task_manager.index'),
      maxAttempts: config.get('xpack.task_manager.max_attempts'),
      supportedTypes: Object.keys(this.definitions),
      logger,
      getKibanaUuid: () => config.get('server.uuid'),
    });
    const pool = new TaskPool({
      logger,
      maxWorkers: this.maxWorkers,
    });
    const createRunner = (instance: ConcreteTaskInstance) =>
      new TaskManagerRunner({
        logger,
        kbnServer,
        instance,
        store,
        definitions: this.definitions,
        beforeRun: this.middleware.beforeRun,
      });
    const poller = new TaskPoller({
      logger,
      pollInterval: config.get('xpack.task_manager.poll_interval'),
      store,
      work(): Promise<void> {
        return fillPool(pool.run, store.fetchAvailableTasks, createRunner);
      },
    });

    this.logger = logger;
    this.store = store;
    this.poller = poller;

    kbnServer.afterPluginsInit(async () => {
      store.addSupportedTypes(Object.keys(this.definitions));
      const startPoller = () => {
        return poller
          .start()
          .then(() => {
            this.isInitialized = true;
          })
          .catch((err: Error) => {
            // FIXME: check the type of error to make sure it's actually an ES error
            logger.warning(err.message);

            // rety again to initialize store and poller, using the timing of
            // task_manager's configurable poll interval
            const retryInterval = config.get('xpack.task_manager.poll_interval');
            setTimeout(() => startPoller(), retryInterval);
          });
      };
      return startPoller();
    });
  }

  /**
   * Method for allowing consumers to register task definitions into the system.
   * @param taskDefinitions - The Kibana task definitions dictionary
   */
  public registerTaskDefinitions(taskDefinitions: TaskDictionary<TaskDefinition>) {
    this.assertUninitialized('register task definitions');
    const duplicate = Object.keys(taskDefinitions).find(k => !!this.definitions[k]);
    if (duplicate) {
      throw new Error(`Task ${duplicate} is already defined!`);
    }

    try {
      const sanitized = sanitizeTaskDefinitions(
        taskDefinitions,
        this.maxWorkers,
        this.overrideNumWorkers
      );

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
  public async schedule(taskInstance: TaskInstance, options?: any): Promise<ConcreteTaskInstance> {
    this.assertInitialized('Tasks cannot be scheduled until after task manager is initialized!');
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...options,
      taskInstance,
    });
    const result = await this.store.schedule(modifiedTask);
    this.poller.attemptWork();
    return result;
  }

  /**
   * Fetches a paginatable list of scheduled tasks.
   *
   * @param opts - The query options used to filter tasks
   * @returns {Promise<FetchResult>}
   */
  public async fetch(opts: FetchOpts): Promise<FetchResult> {
    this.assertInitialized('Tasks cannot be fetched before task manager is initialized!');
    return this.store.fetch(opts);
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<RemoveResult>}
   */
  public async remove(id: string): Promise<RemoveResult> {
    this.assertInitialized('Tasks cannot be removed before task manager is initialized!');
    return this.store.remove(id);
  }

  /**
   * Ensures task manager IS NOT already initialized
   *
   * @param {string} message shown if task manager is already initialized
   * @returns void
   */
  private assertUninitialized(message: string) {
    if (this.isInitialized) {
      throw new Error(`Cannot ${message} after the task manager is initialized!`);
    }
  }

  /**
   * Ensures task manager IS already initialized
   *
   * @param {string} message shown if task manager is not initialized
   * @returns void
   */
  private assertInitialized(message: string) {
    if (!this.isInitialized) {
      throw new Error(`NotInitialized: ${message}`);
    }
  }
}
