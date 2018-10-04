/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fillPool } from './lib/fill_pool';
import { TaskManagerLogger } from './lib/logger';
import { addMiddlewareToChain, BeforeSaveMiddlewareParams, Middleware } from './lib/middleware';
import { sanitizeTaskDefinitions } from './lib/sanitize_task_definitions';
import { ConcreteTaskInstance, RunContext, TaskInstance } from './task';
import { SanitizedTaskDefinition, TaskDefinition, TaskDictionary } from './task';
import { TaskPoller } from './task_poller';
import { TaskPool } from './task_pool';
import { TaskManagerRunner } from './task_runner';
import { FetchOpts, TaskStore } from './task_store';

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
  private store?: TaskStore;
  private poller?: TaskPoller;
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

    kbnServer.afterPluginsInit(() => {
      const store = new TaskStore({
        callCluster: server.plugins.elasticsearch.getCluster('admin').callWithInternalUser,
        index: config.get('xpack.task_manager.index'),
        maxAttempts: config.get('xpack.task_manager.max_attempts'),
        supportedTypes: Object.keys(this.definitions),
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
          definition: this.definitions[instance.taskType],
          beforeRun: this.middleware.beforeRun,
        });
      const poller = new TaskPoller({
        logger,
        pollInterval: config.get('xpack.task_manager.poll_interval'),
        work() {
          return fillPool(pool.run, store.fetchAvailableTasks, createRunner);
        },
      });

      bindToElasticSearchStatus(server.plugins.elasticsearch, logger, poller, store);

      this.store = store;
      this.poller = poller;
      this.isInitialized = true;
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

    const sanitized = sanitizeTaskDefinitions(
      taskDefinitions,
      this.maxWorkers,
      this.overrideNumWorkers
    );
    Object.assign(this.definitions, sanitized);
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
   */
  public async schedule(taskInstance: TaskInstance, options?: any) {
    this.assertInitialized();
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...options,
      taskInstance,
    });
    const result = await this.store!.schedule(modifiedTask);
    this.poller!.attemptWork();
    return result;
  }

  /**
   * Fetches a paginatable list of scheduled tasks.
   *
   * @param opts - The query options used to filter tasks
   */
  public async fetch(opts: FetchOpts) {
    this.assertInitialized();
    return this.store!.fetch(opts);
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async remove(id: string) {
    this.assertInitialized();
    return this.store!.remove(id);
  }

  private assertUninitialized(message: string) {
    if (this.isInitialized) {
      throw new Error(`Cannot ${message} after the task manager is initialized.`);
    }
  }

  private assertInitialized() {
    if (!this.isInitialized) {
      throw new Error('The task manager is initializing.');
    }
  }
}

// This is exported for test purposes. It is responsible for starting / stopping
// the poller based on the elasticsearch plugin status.
export function bindToElasticSearchStatus(
  elasticsearch: any,
  logger: { debug: (s: string) => any; info: (s: string) => any },
  poller: { stop: () => any; start: () => Promise<any> },
  store: { init: () => Promise<any> }
) {
  elasticsearch.status.on('red', () => {
    logger.debug('Lost connection to Elasticsearch, stopping the poller.');
    poller.stop();
  });

  elasticsearch.status.on('green', async () => {
    logger.debug('Initializing store');
    await store.init();
    logger.debug('Starting poller');
    await poller.start();
    logger.info('Connected to Elasticsearch, and watching for tasks');
  });
}
