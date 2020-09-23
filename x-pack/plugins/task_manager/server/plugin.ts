/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup, CoreStart, Logger } from 'src/core/server';
import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { TaskDictionary, TaskDefinition } from './task';
import { TaskManager } from './task_manager';
import { TaskManagerConfig } from './config';
import { Middleware } from './lib/middleware';
import { setupSavedObjects } from './saved_objects';
import { healthRoute } from './routes';
import { createAggregatedStatsStream } from './monitoring';

export type TaskManagerSetupContract = Pick<
  TaskManager,
  'addMiddleware' | 'registerTaskDefinitions'
>;

export type TaskManagerStartContract = Pick<
  TaskManager,
  'fetch' | 'get' | 'remove' | 'schedule' | 'runNow' | 'ensureScheduled'
>;

export class TaskManagerPlugin
  implements Plugin<TaskManagerSetupContract, TaskManagerStartContract> {
  legacyTaskManager$: Subject<TaskManager> = new Subject<TaskManager>();
  taskManager: Promise<TaskManager> = this.legacyTaskManager$.pipe(first()).toPromise();
  currentConfig: TaskManagerConfig;
  taskManagerId?: string;
  config?: TaskManagerConfig;
  logger: Logger;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.currentConfig = {} as TaskManagerConfig;
    this.logger = initContext.logger.get('taskManager');
  }

  public async setup(core: CoreSetup): Promise<TaskManagerSetupContract> {
    const { logger } = this;
    const config = (this.config = await this.initContext.config
      .create<TaskManagerConfig>()
      .pipe(first())
      .toPromise());

    setupSavedObjects(core.savedObjects, this.config);
    this.taskManagerId = this.initContext.env.instanceUuid;

    // Routes
    const router = core.http.createRouter();
    healthRoute(
      router,
      config,
      this.taskManager.then((tm) => createAggregatedStatsStream(tm, config, logger)),
      // if health is any more stale than the pollInterval (+1s buffer) consider the system unhealthy
      config.poll_interval + 1000
    );

    return {
      addMiddleware: (middleware: Middleware) => {
        this.taskManager.then((tm) => tm.addMiddleware(middleware));
      },
      registerTaskDefinitions: (taskDefinition: TaskDictionary<TaskDefinition>) => {
        this.taskManager.then((tm) => tm.registerTaskDefinitions(taskDefinition));
      },
    };
  }

  public start({ savedObjects, elasticsearch }: CoreStart): TaskManagerStartContract {
    const { logger } = this;
    const savedObjectsRepository = savedObjects.createInternalRepository(['task']);

    this.legacyTaskManager$.next(
      new TaskManager({
        taskManagerId: this.taskManagerId!,
        config: this.config!,
        savedObjectsRepository,
        serializer: savedObjects.createSerializer(),
        callAsInternalUser: elasticsearch.legacy.client.callAsInternalUser,
        logger,
      })
    );
    this.legacyTaskManager$.complete();

    // we need to "drain" any calls made to the seup API
    // before `starting` TaskManager. This is a legacy relic
    // of the old API that should be resolved once we split
    // Task manager into two services, setup and start, instead
    // of the single instance of TaskManager
    this.taskManager.then((tm) => tm.start());

    return {
      fetch: (...args) => this.taskManager.then((tm) => tm.fetch(...args)),
      get: (...args) => this.taskManager.then((tm) => tm.get(...args)),
      remove: (...args) => this.taskManager.then((tm) => tm.remove(...args)),
      schedule: (...args) => this.taskManager.then((tm) => tm.schedule(...args)),
      runNow: (...args) => this.taskManager.then((tm) => tm.runNow(...args)),
      ensureScheduled: (...args) => this.taskManager.then((tm) => tm.ensureScheduled(...args)),
    };
  }
  public stop() {
    this.taskManager.then((tm) => {
      tm.stop();
    });
  }
}
