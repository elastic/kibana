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

export interface AlertingV2FixtureSetupDeps {
  taskManager: TaskManagerSetupContract;
}
export interface AlertingV2FixtureStartDeps {
  taskManager: TaskManagerStartContract;
}

export class AlertingV2Fixture
  implements Plugin<void, void, AlertingV2FixtureSetupDeps, AlertingV2FixtureStartDeps>
{
  taskManagerStart$: Subject<TaskManagerStartContract> = new Subject<TaskManagerStartContract>();
  taskManagerStart: Promise<TaskManagerStartContract> = firstValueFrom(this.taskManagerStart$);

  public setup(core: CoreSetup, _: AlertingV2FixtureSetupDeps) {
    initRoutes(core.http.createRouter(), this.taskManagerStart);
  }

  public start(_: CoreStart, { taskManager }: AlertingV2FixtureStartDeps) {
    this.taskManagerStart$.next(taskManager);
    this.taskManagerStart$.complete();
  }
  public stop() {}
}
