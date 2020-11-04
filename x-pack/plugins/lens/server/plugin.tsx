/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart, PluginInitializerContext, Logger } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { Observable } from 'rxjs';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { setupRoutes } from './routes';
import {
  registerLensUsageCollector,
  initializeLensTelemetry,
  scheduleLensTelemetry,
} from './usage';
import { setupSavedObjects } from './saved_objects';

export interface PluginSetupContract {
  usageCollection?: UsageCollectionSetup;
  taskManager?: TaskManagerSetupContract;
}

export interface PluginStartContract {
  taskManager?: TaskManagerStartContract;
}

export class LensServerPlugin implements Plugin<{}, {}, {}, {}> {
  private readonly kibanaIndexConfig: Observable<{ kibana: { index: string } }>;
  private readonly telemetryLogger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.kibanaIndexConfig = initializerContext.config.legacy.globalConfig$;
    this.telemetryLogger = initializerContext.logger.get('usage');
  }
  setup(core: CoreSetup<PluginStartContract>, plugins: PluginSetupContract) {
    setupSavedObjects(core);
    setupRoutes(core, this.initializerContext.logger.get());
    if (plugins.usageCollection && plugins.taskManager) {
      registerLensUsageCollector(
        plugins.usageCollection,
        core
          .getStartServices()
          .then(([_, { taskManager }]) => taskManager as TaskManagerStartContract)
      );
      initializeLensTelemetry(
        this.telemetryLogger,
        core,
        this.kibanaIndexConfig,
        plugins.taskManager
      );
    }
    return {};
  }

  start(core: CoreStart, plugins: PluginStartContract) {
    if (plugins.taskManager) {
      scheduleLensTelemetry(this.telemetryLogger, plugins.taskManager);
    }
    return {};
  }

  stop() {}
}
