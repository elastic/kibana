/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { registerCollectors } from './lib/collectors';
import { registerTasks, scheduleTasks } from './lib/tasks';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';

export interface OssTelemetrySetupDependencies {
  usageCollection: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
}
export interface OssTelemetryStartDependencies {
  taskManager: TaskManagerStartContract;
}

export class OssTelemetryPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly config: Observable<{ kibana: { index: string } }>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('oss_telemetry');
    this.config = initializerContext.config.legacy.globalConfig$;
  }

  public setup(
    core: CoreSetup<OssTelemetryStartDependencies>,
    deps: OssTelemetrySetupDependencies
  ) {
    registerTasks({
      taskManager: deps.taskManager,
      logger: this.logger,
      getStartServices: core.getStartServices,
      config: this.config,
    });
    registerCollectors(
      deps.usageCollection,
      core.getStartServices().then(([_, { taskManager }]) => taskManager)
    );
  }

  public start(core: CoreStart, deps: OssTelemetryStartDependencies) {
    scheduleTasks({
      taskManager: deps.taskManager,
      logger: this.logger,
    });
  }
}
