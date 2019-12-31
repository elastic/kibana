/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { Observable, combineLatest, AsyncSubject } from 'rxjs';
import { once } from 'lodash';
import {
  Plugin as TaskManagerLegacyPlugin,
  PluginContract,
} from '../../../legacy/plugins/task_manager/server/plugin';
import {
  TaskDictionary,
  TaskDefinition,
  Middleware,
} from '../../../legacy/plugins/task_manager/server';
import { TaskManagerConfig } from './config';

interface LegacyDependencies {
  serializer: any;
  savedObjects: any;
  elasticsearch: any;
}

export interface LegacySetup {
  legacyPlugin: TaskManagerLegacyPlugin;
  legacyDependencies: LegacyDependencies;
}

export type TaskManagerPluginSetupContract = {
  config$: Observable<TaskManagerConfig>;
  registerLegacyAPI: (LegacyPlugin: LegacySetup) => void;
} & Pick<PluginContract, 'addMiddleware' | 'registerTaskDefinitions'>;

export type TaskManagerPluginStartContract = Omit<
  PluginContract,
  'addMiddleware' | 'registerTaskDefinitions'
>;

export class TaskManagerPlugin
  implements Plugin<TaskManagerPluginSetupContract, TaskManagerPluginStartContract> {
  legacySetup$: AsyncSubject<LegacySetup> = new AsyncSubject<LegacySetup>();
  legacySetupResult: Promise<LegacySetup> = new Promise(resolve => {
    this.legacySetup$.subscribe(__LEGACY => {
      resolve(__LEGACY);
    });
  });
  currentConfig: TaskManagerConfig;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.currentConfig = {} as TaskManagerConfig;
  }

  public setup(core: CoreSetup, plugins: any): TaskManagerPluginSetupContract {
    const config$ = this.initContext.config.create<TaskManagerConfig>();

    const legacyTaskManager = new Promise<PluginContract>(resolve => {
      combineLatest(config$, core.elasticsearch.dataClient$).subscribe(
        async ([config, elasticsearch]) => {
          this.legacySetupResult.then(({ legacyPlugin, legacyDependencies }) => {
            const logger = this.initContext.logger.get('kibanaTaskManager');
            resolve(legacyPlugin.setup(core, { logger, config, ...legacyDependencies }));
          });
        }
      );
    });

    return {
      config$,
      registerLegacyAPI: once((legacySetup: LegacySetup) => {
        this.legacySetup$.next(legacySetup);
        this.legacySetup$.complete();
        return legacyTaskManager;
      }),
      addMiddleware: (middleware: Middleware) => {
        legacyTaskManager.then(tm => tm.addMiddleware(middleware));
      },
      registerTaskDefinitions: (taskDefinition: TaskDictionary<TaskDefinition>) => {
        legacyTaskManager.then(tm => tm.registerTaskDefinitions(taskDefinition));
      },
    };
  }

  public start(): TaskManagerPluginStartContract {
    const taskManager = this.legacySetupResult.then(({ legacyPlugin }) => legacyPlugin.start());
    return {
      fetch: (...args) => taskManager.then(tm => tm.fetch(...args)),
      remove: (...args) => taskManager.then(tm => tm.remove(...args)),
      schedule: (...args) => taskManager.then(tm => tm.schedule(...args)),
      runNow: (...args) => taskManager.then(tm => tm.runNow(...args)),
      ensureScheduled: (...args) => taskManager.then(tm => tm.ensureScheduled(...args)),
    };
  }
  public stop() {
    this.legacySetupResult.then(({ legacyPlugin }) => {
      legacyPlugin.stop();
    });
  }
}
