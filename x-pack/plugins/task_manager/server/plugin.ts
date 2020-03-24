/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { once } from 'lodash';
import { TaskDictionary, TaskDefinition } from './task';
import { TaskManager } from './task_manager';
import { createTaskManager } from './create_task_manager';
import { TaskManagerConfig } from './config';
import { Middleware } from './lib/middleware';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginLegacyDependencies {}
export type TaskManagerSetupContract = {
  registerLegacyAPI: (legacyDependencies: PluginLegacyDependencies) => Promise<TaskManager>;
} & Pick<TaskManager, 'addMiddleware' | 'registerTaskDefinitions'>;

export type TaskManagerStartContract = Pick<
  TaskManager,
  'fetch' | 'get' | 'remove' | 'schedule' | 'runNow' | 'ensureScheduled'
>;

export class TaskManagerPlugin
  implements Plugin<TaskManagerSetupContract, TaskManagerStartContract> {
  legacyTaskManager$: Subject<TaskManager> = new Subject<TaskManager>();
  taskManager: Promise<TaskManager> = this.legacyTaskManager$.pipe(first()).toPromise();
  currentConfig: TaskManagerConfig;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.currentConfig = {} as TaskManagerConfig;
  }

  public setup(core: CoreSetup, plugins: any): TaskManagerSetupContract {
    const logger = this.initContext.logger.get('taskManager');
    const config$ = this.initContext.config.create<TaskManagerConfig>();
    const elasticsearch = core.elasticsearch.adminClient;
    return {
      registerLegacyAPI: once((__LEGACY: PluginLegacyDependencies) => {
        config$.subscribe(async config => {
          const [{ savedObjects }] = await core.getStartServices();
          const savedObjectsRepository = savedObjects.createInternalRepository(['task']);
          this.legacyTaskManager$.next(
            createTaskManager(core, {
              logger,
              config,
              elasticsearch,
              savedObjectsRepository,
              savedObjectsSerializer: savedObjects.createSerializer(),
            })
          );
          this.legacyTaskManager$.complete();
        });
        return this.taskManager;
      }),
      addMiddleware: (middleware: Middleware) => {
        this.taskManager.then(tm => tm.addMiddleware(middleware));
      },
      registerTaskDefinitions: (taskDefinition: TaskDictionary<TaskDefinition>) => {
        this.taskManager.then(tm => tm.registerTaskDefinitions(taskDefinition));
      },
    };
  }

  public start(): TaskManagerStartContract {
    return {
      fetch: (...args) => this.taskManager.then(tm => tm.fetch(...args)),
      get: (...args) => this.taskManager.then(tm => tm.get(...args)),
      remove: (...args) => this.taskManager.then(tm => tm.remove(...args)),
      schedule: (...args) => this.taskManager.then(tm => tm.schedule(...args)),
      runNow: (...args) => this.taskManager.then(tm => tm.runNow(...args)),
      ensureScheduled: (...args) => this.taskManager.then(tm => tm.ensureScheduled(...args)),
    };
  }
  public stop() {
    this.taskManager.then(tm => {
      tm.stop();
    });
  }
}
