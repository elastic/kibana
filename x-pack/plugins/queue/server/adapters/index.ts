/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Worker } from '../worker_registry';
import type { PluginSetupDeps, PluginStartDeps, Job } from '../plugin';
import * as taskManager from './task_manager';

const ADAPTERS = ['taskManager', 'bar'] as const;
const CONFIGURED_ADAPTER: typeof ADAPTERS[number] = 'taskManager';

export function registerWorkerAdapter(worker: Worker<unknown>, plugins: PluginSetupDeps) {
  switch (CONFIGURED_ADAPTER) {
    case 'taskManager':
      taskManager.registerWorkerAdapter(worker, plugins);
      break;
  }
}

export function enqueueAdater(job: Job<unknown>, plugins: PluginStartDeps) {
  switch (CONFIGURED_ADAPTER) {
    case 'taskManager':
      taskManager.enqueueAdater(job, plugins);
      break;
  }
}

export function bulkEnqueueAdapter(jobs: Array<Job<unknown>>, plugins: PluginStartDeps) {
  switch (CONFIGURED_ADAPTER) {
    case 'taskManager':
      taskManager.bulkEnqueueAdapter(jobs, plugins);
      break;
  }
}
