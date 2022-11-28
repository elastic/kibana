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
  RunContext,
} from '@kbn/task-manager-plugin/server';
import { Worker, WorkerRegistry } from './worker_registry';

interface Job<T> {
  workerId: string;
  params: T;
}

export interface PluginSetup {
  registerWorker(worker: Worker<unknown>): void;
}
interface PluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface PluginStart {
  enqueue(job: Job<unknown>): Promise<void>;
}
interface PluginStartDeps {
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
        plugins.taskManager.registerTaskDefinitions({
          [`plugin:queue:${worker.id}`]: {
            title: `Worker: ${worker.id}`,
            createTaskRunner: ({ taskInstance }: RunContext) => {
              const params = taskInstance.params;
              const abortController = new AbortController();
              return {
                run: async () => {
                  await worker.run(params, abortController.signal);
                },
                cancel: async () => {
                  abortController.abort();
                },
              };
            },
          },
        });
      },
    };
  }

  public start(coreStart: CoreStart, plugins: PluginStartDeps) {
    return {
      enqueue: async (job: Job<unknown>) => {
        await plugins.taskManager.schedule({
          taskType: `plugin:scheduler:${job.workerId}`,
          params: job.params as Record<string, any>,
          state: {},
        });
      },
    };
  }
}
