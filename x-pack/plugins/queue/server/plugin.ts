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
import { registerWorkerAdapter, enqueueAdater, bulkEnqueueAdapter } from './adapters';

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

export class QueuePlugin
  implements Plugin<PluginSetup, PluginStart, PluginSetupDeps, PluginStartDeps>
{
  private readonly workerRegistry = new WorkerRegistry();

  public setup(core: CoreSetup, plugins: PluginSetupDeps) {
    return {
      registerWorker: (worker: Worker<unknown>) => {
        this.workerRegistry.register(worker);
        registerWorkerAdapter(worker, plugins);
      },
    };
  }

  public start(coreStart: CoreStart, plugins: PluginStartDeps) {
    return {
      enqueue: async (job: Job<unknown>) => {
        await enqueueAdater(job, plugins);
      },
      bulkEnqueue: async (jobs: Array<Job<unknown>>) => {
        await bulkEnqueueAdapter(jobs, plugins);
      },
    };
  }
}
