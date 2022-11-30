/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunContext, asInterval } from '@kbn/task-manager-plugin/server';
import type { Worker } from '../worker_registry';
import { PluginSetupDeps, PluginStartDeps, Job, Adapter } from '../plugin';

export const taskManagerAdapter: Adapter = {
  setup() {},
  start() {},
  registerWorkerAdapter: (worker: Worker<unknown>, plugins: PluginSetupDeps) => {
    plugins.taskManager.registerTaskDefinitions({
      [`plugin:scheduler:${worker.id}`]: {
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
  scheduleAdapter: async (job: Job<unknown>, plugins: PluginStartDeps) => {
    await plugins.taskManager.schedule({
      id: job.id && `plugin:scheduler:${job.id}`,
      taskType: `plugin:scheduler:${job.workerId}`,
      params: job.params as Record<string, any>,
      schedule: {
        interval: asInterval(job.interval),
      },
      state: {},
    });
  },
  unscheduleAdapter: async (jobId: Job<unknown>['id'], plugins: PluginStartDeps) => {
    await plugins.taskManager.remove(`plugin:scheduler:${jobId}`);
  },
};
