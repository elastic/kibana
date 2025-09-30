/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import { firstValueFrom, Subject } from 'rxjs';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { initRoutes } from './init_routes';

// this plugin's dependendencies
export interface ReportingFixtureSetupDeps {
  taskManager: TaskManagerSetupContract;
}
export interface ReportingFixtureStartDeps {
  taskManager: TaskManagerStartContract;
}

export class ReportingFixture
  implements Plugin<void, void, ReportingFixtureSetupDeps, ReportingFixtureStartDeps>
{
  taskManagerStart$: Subject<TaskManagerStartContract> = new Subject<TaskManagerStartContract>();
  taskManagerStart: Promise<TaskManagerStartContract> = firstValueFrom(this.taskManagerStart$);

  public setup(core: CoreSetup, _: ReportingFixtureSetupDeps) {
    initRoutes(core.http.createRouter(), this.taskManagerStart);
  }

  public start(_: CoreStart, { taskManager }: ReportingFixtureStartDeps) {
    this.taskManagerStart$.next(taskManager);
    this.taskManagerStart$.complete();
  }
  public stop() {}
}
