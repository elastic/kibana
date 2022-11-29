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
import { taskManagerAdapter, rabbitmqAdapter } from './adapters';

// Set this to whatever one you want to use!
const CONFIGURED_ADAPTER = 'taskManager';
const availableAdapters = {
  taskManager: taskManagerAdapter,
  rabbitmq: rabbitmqAdapter,
};

export interface Job<T> {
  workerId: string;
  params: T;
}

export interface PluginSetup {
  registerWorker(worker: Worker<unknown>): void;
}
export interface PluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface PluginStart {
  enqueue(job: Job<unknown>): Promise<void>;
  bulkEnqueue(jobs: Array<Job<unknown>>): Promise<void>;
}
export interface PluginStartDeps {
  taskManager: TaskManagerStartContract;
}

export interface Adapter {
  setup(plugins: PluginSetupDeps): void;
  start(plugins: PluginStartDeps): void;
  registerWorkerAdapter(worker: Worker<unknown>, plugins: PluginSetupDeps): void;
  enqueueAdater(job: Job<unknown>, plugins: PluginStartDeps): Promise<void>;
  bulkEnqueueAdapter(jobs: Array<Job<unknown>>, plugins: PluginStartDeps): Promise<void>;
}

export class QueuePlugin
  implements Plugin<PluginSetup, PluginStart, PluginSetupDeps, PluginStartDeps>
{
  private readonly adapter: Adapter;
  private readonly workerRegistry = new WorkerRegistry();

  constructor() {
    this.adapter = availableAdapters[CONFIGURED_ADAPTER];
  }

  public setup(core: CoreSetup, plugins: PluginSetupDeps) {
    this.adapter.setup(plugins);
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
      enqueue: async (job: Job<unknown>) => {
        await this.adapter.enqueueAdater(job, plugins);
      },
      bulkEnqueue: async (jobs: Array<Job<unknown>>) => {
        await this.adapter.bulkEnqueueAdapter(jobs, plugins);
      },
    };
  }
}
