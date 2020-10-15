/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup, Logger, CoreStart } from 'src/core/server';
import { first } from 'rxjs/operators';
import { ElasticJs, TaskDefinition } from './task';
import { TaskManager } from './task_manager';
import { TaskManagerConfig } from './config';
import { createInitialMiddleware, addMiddlewareToChain, Middleware } from './lib/middleware';
import { setupSavedObjects } from './saved_objects';
import { TaskTypeDictionary } from './task_type_dictionary';
import { FetchResult, SearchOpts, TaskStore } from './task_store';
import { createManagedConfiguration } from './lib/create_managed_configuration';

export type TaskManagerSetupContract = { addMiddleware: (middleware: Middleware) => void } & Pick<
  TaskTypeDictionary,
  'registerTaskDefinitions'
>;

export type TaskManagerStartContract = Pick<
  TaskManager,
  'schedule' | 'runNow' | 'ensureScheduled'
> &
  Pick<TaskStore, 'fetch' | 'get' | 'remove'>;

export class TaskManagerPlugin
  implements Plugin<TaskManagerSetupContract, TaskManagerStartContract> {
  private taskManager?: TaskManager;
  private taskManagerId?: string;
  private config?: TaskManagerConfig;
  private logger: Logger;
  private definitions: TaskTypeDictionary;
  private middleware: Middleware = createInitialMiddleware();

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get('taskManager');
    this.definitions = new TaskTypeDictionary(this.logger);
  }

  public async setup({ savedObjects }: CoreSetup): Promise<TaskManagerSetupContract> {
    this.config = await this.initContext.config
      .create<TaskManagerConfig>()
      .pipe(first())
      .toPromise();

    setupSavedObjects(savedObjects, this.config);
    this.taskManagerId = this.initContext.env.instanceUuid;

    return {
      /**
       * Adds middleware to the task manager, such as adding security layers, loggers, etc.
       *
       * @param {Middleware} middleware - The middlware being added.
       */
      addMiddleware: (middleware: Middleware) => {
        this.assertStillInSetup('add Middleware');
        this.middleware = addMiddlewareToChain(this.middleware, middleware);
      },
      registerTaskDefinitions: (taskDefinition: Record<string, TaskDefinition>) => {
        this.assertStillInSetup('register task definitions');
        this.definitions.registerTaskDefinitions(taskDefinition);
      },
    };
  }

  public start({ savedObjects, elasticsearch }: CoreStart): TaskManagerStartContract {
    const savedObjectsRepository = savedObjects.createInternalRepository(['task']);

    const taskStore = new TaskStore({
      serializer: savedObjects.createSerializer(),
      savedObjectsRepository,
      callCluster: (elasticsearch.legacy.client.callAsInternalUser as unknown) as ElasticJs,
      index: this.config!.index,
      maxAttempts: this.config!.max_attempts,
      definitions: this.definitions,
      taskManagerId: `kibana:${this.taskManagerId!}`,
    });

    const { maxWorkersConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      logger: this.logger,
      errors$: taskStore.errors$,
      startingMaxWorkers: this.config!.max_workers,
      startingPollInterval: this.config!.poll_interval,
    });

    const taskManager = new TaskManager({
      taskManagerId: this.taskManagerId!,
      config: this.config!,
      definitions: this.definitions,
      logger: this.logger,
      taskStore,
      middleware: this.middleware,
      maxWorkersConfiguration$,
      pollIntervalConfiguration$,
    });
    this.taskManager = taskManager;

    // start polling for work
    taskManager.start();

    return {
      /**
       * Fetches a list of scheduled tasks.
       *
       * @param opts - The query options used to filter tasks
       * @returns {Promise<FetchResult>}
       */
      fetch: (opts: SearchOpts): Promise<FetchResult> => taskStore.fetch(opts),
      /**
       * Get the current state of a specified task.
       *
       * @param {string} id
       * @returns {Promise<ConcreteTaskInstance>}
       */
      get: (id: string) => taskStore.get(id),
      /**
       * Removes the specified task from the index.
       *
       * @param {string} id
       * @returns {Promise<void>}
       */
      remove: (id: string) => taskStore.remove(id),
      schedule: (...args) => taskManager.schedule(...args),
      ensureScheduled: (...args) => taskManager.ensureScheduled(...args),
      runNow: (...args) => taskManager.runNow(...args),
    };
  }

  public stop() {
    if (this.taskManager) {
      this.taskManager.stop();
    }
  }

  /**
   * Ensures task manager hasn't started
   *
   * @param {string} the name of the operation being executed
   * @returns void
   */
  private assertStillInSetup(operation: string) {
    if (this.taskManager?.isStarted) {
      throw new Error(`Cannot ${operation} after the task manager has started`);
    }
  }
}
