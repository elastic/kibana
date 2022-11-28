/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { Worker } from '../worker_registry';
import type { PluginSetupDeps, PluginStartDeps, Job } from '../plugin';

export function registerWorkerAdapter(worker: Worker<unknown>, plugins: PluginSetupDeps) {
  plugins.taskManager.registerTaskDefinitions({
    [`plugin:queue:${worker.id}`]: {
      title: `Worker: ${worker.id}`,
      maxAttempts: 3,
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
}

export async function enqueueAdater(job: Job<unknown>, plugins: PluginStartDeps) {
  await plugins.taskManager.schedule({
    taskType: `plugin:queue:${job.workerId}`,
    params: job.params as Record<string, any>,
    state: {},
  });
}

export async function bulkEnqueueAdapter(jobs: Array<Job<unknown>>, plugins: PluginStartDeps) {
  await plugins.taskManager.bulkSchedule(
    jobs.map((job) => ({
      taskType: `plugin:queue:${job.workerId}`,
      params: job.params as Record<string, any>,
      state: {},
    }))
  );
}
