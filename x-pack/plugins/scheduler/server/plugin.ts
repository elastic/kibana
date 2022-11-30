/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart, RequestHandlerContext } from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { Worker, WorkerRegistry } from './worker_registry';
import { taskManagerAdapter, sqsAdapter } from './adapters';
import { registerRoutes } from './routes';

// Set this to whatever one you want to use!
const CONFIGURED_ADAPTER = 'sqs';
const availableAdapters = {
  sqs: sqsAdapter,
  taskManager: taskManagerAdapter,
};

export interface Job<T> {
  deduplicationId?: string;
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
  unschedule(deduplicationId: string): Promise<void>;
}
export interface PluginStartDeps {
  taskManager: TaskManagerStartContract;
}

export interface Adapter {
  setup(plugins: PluginSetupDeps): void;
  start(plugins: PluginStartDeps): void;
  registerWorkerAdapter(worker: Worker<unknown>, plugins: PluginSetupDeps): void;
  scheduleAdapter(job: Job<unknown>, plugins: PluginStartDeps): Promise<void>;
  unscheduleAdapter(deduplicationId: string, plugins: PluginStartDeps): Promise<void>;
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
    this.adapter.setup(plugins);
    const router = core.http.createRouter<RequestHandlerContext>();
    registerRoutes(router);
    return {
      registerWorker: (worker: Worker<unknown>) => {
        this.workerRegistry.register(worker);
        this.adapter.registerWorkerAdapter(worker, plugins);
      },
    };
  }

  public start(coreStart: CoreStart, plugins: PluginStartDeps) {
    this.adapter.start(plugins);
    return {
      schedule: async (job: Job<unknown>) => {
        await this.adapter.scheduleAdapter(job, plugins);
      },
      unschedule: async (deduplicationId: string) => {
        await this.adapter.unscheduleAdapter(deduplicationId, plugins);
      },
    };
  }
}
