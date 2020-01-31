/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subject } from 'rxjs';
import { first } from 'rxjs/operators';
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
  private readonly taskManagerStartContract$ = new Subject<TaskManagerStartContract>();

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('oss_telemetry');
    this.config = initializerContext.config.legacy.globalConfig$;
  }

  public setup(core: CoreSetup, deps: OssTelemetrySetupDependencies) {
    registerTasks({
      taskManager: deps.taskManager,
      logger: this.logger,
      elasticsearch: core.elasticsearch,
      config: this.config,
    });
    registerCollectors(
      deps.usageCollection,
      this.taskManagerStartContract$.pipe(first()).toPromise()
    );
  }

  public start(core: CoreStart, deps: OssTelemetryStartDependencies) {
    this.taskManagerStartContract$.next(deps.taskManager);
    this.taskManagerStartContract$.complete();

    scheduleTasks({
      taskManager: deps.taskManager,
      logger: this.logger,
    });
  }
}
