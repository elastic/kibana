/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { Observable, combineLatest, Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { once } from 'lodash';
import {
  LifecycleContract,
  TaskManager as TaskManagerContract,
} from '../../../legacy/plugins/task_manager/server';
import {
  TaskDictionary,
  TaskDefinition,
  Middleware,
} from '../../../legacy/plugins/task_manager/server';
import { TaskManagerConfig } from './config';

export type LegacyApi = TaskManagerContract & LifecycleContract;
export type LegacySetup = (core: any, deps: any) => LegacyApi;

export type TaskManagerPluginSetupContract = {
  config$: Observable<TaskManagerConfig>;
  registerLegacyAPI: (LegacyPlugin: LegacySetup) => void;
} & Pick<TaskManagerContract, 'addMiddleware' | 'registerTaskDefinitions'>;

export type TaskManagerPluginStartContract = Omit<
  TaskManagerContract,
  'addMiddleware' | 'registerTaskDefinitions'
>;

export class TaskManagerPlugin
  implements Plugin<TaskManagerPluginSetupContract, TaskManagerPluginStartContract> {
  legacyTaskManager$: Subject<LegacyApi> = new Subject<LegacyApi>();
  taskManager: Promise<LegacyApi> = this.legacyTaskManager$.pipe(first()).toPromise();
  currentConfig: TaskManagerConfig;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.currentConfig = {} as TaskManagerConfig;
  }

  public setup(core: CoreSetup, plugins: any): TaskManagerPluginSetupContract {
    const logger = this.initContext.logger.get('kibanaTaskManager');
    const config$ = this.initContext.config.create<TaskManagerConfig>();

    return {
      config$,
      registerLegacyAPI: once((createTaskManager: LegacySetup) => {
        combineLatest(config$, core.elasticsearch.adminClient$).subscribe(
          async ([config, elasticsearch]) => {
            this.legacyTaskManager$.next(
              createTaskManager(core, { logger, config, elasticsearch })
            );
            this.legacyTaskManager$.complete();
          }
        );
      }),
      addMiddleware: (middleware: Middleware) => {
        this.taskManager.then(tm => tm.addMiddleware(middleware));
      },
      registerTaskDefinitions: (taskDefinition: TaskDictionary<TaskDefinition>) => {
        this.taskManager.then(tm => tm.registerTaskDefinitions(taskDefinition));
      },
    };
  }

  public start(): TaskManagerPluginStartContract {
    return {
      fetch: (...args) => this.taskManager.then(tm => tm.fetch(...args)),
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
