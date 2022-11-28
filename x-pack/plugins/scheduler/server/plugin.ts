/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { Worker, WorkerRegistry } from './worker_registry';
import { taskManagerAdapter } from './adapters';

// Set this to whatever one you want to use!
const CONFIGURED_ADAPTER = 'taskManager';
const availableAdapters = {
  taskManager: taskManagerAdapter,
};

export interface Job<T> {
  id?: string;
  workerId: string;
  interval: number; // milliseconds
  params: T;
}

export interface PluginSetup {
  registerWorker(worker: Worker<unknown>): void;
}
export interface PluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface PluginStart {
  schedule(job: Job<unknown>): Promise<void>;
  unschedule(jobId: Job<unknown>['id']): Promise<void>;
}
export interface PluginStartDeps {
  taskManager: TaskManagerStartContract;
}

export interface Adapter {
  registerWorkerAdapter(worker: Worker<unknown>, plugins: PluginSetupDeps): void;
  scheduleAdapter(job: Job<unknown>, plugins: PluginStartDeps): Promise<void>;
  unscheduleAdapter(jobId: Job<unknown>['id'], plugins: PluginStartDeps): Promise<void>;
}

export class SchedulerPlugin
  implements Plugin<PluginSetup, PluginStart, PluginSetupDeps, PluginStartDeps>
{
  private readonly adapter: Adapter;
  private readonly workerRegistry = new WorkerRegistry();

  constructor() {
    this.adapter = availableAdapters[CONFIGURED_ADAPTER];
  }

  public setup(core: CoreSetup, plugins: PluginSetupDeps) {
    return {
      registerWorker: (worker: Worker<unknown>) => {
        this.workerRegistry.register(worker);
        this.adapter.registerWorkerAdapter(worker, plugins);
      },
    };
  }

  public start(coreStart: CoreStart, plugins: PluginStartDeps) {
    return {
      schedule: async (job: Job<unknown>) => {
        await this.adapter.scheduleAdapter(job, plugins);
      },
      unschedule: async (jobId: Job<unknown>['id']) => {
        await this.adapter.unscheduleAdapter(jobId, plugins);
      },
    };
  }
}
