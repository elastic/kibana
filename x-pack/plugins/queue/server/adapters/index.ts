/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Worker } from '../worker_registry';
import type { PluginSetupDeps, PluginStartDeps, Job } from '../plugin';
import * as taskManager from './task_manager';
import * as rabbitmq from './rabbitmq';

const ADAPTERS = ['taskManager', 'rabbitmq'] as const;
const CONFIGURED_ADAPTER: typeof ADAPTERS[number] = 'rabbitmq';

export function registerWorkerAdapter(worker: Worker<unknown>, plugins: PluginSetupDeps) {
  switch (CONFIGURED_ADAPTER) {
    case 'taskManager':
      taskManager.registerWorkerAdapter(worker, plugins);
      break;
    case 'rabbitmq':
      rabbitmq.registerWorkerAdapter(worker, plugins);
      break;
  }
}

export function enqueueAdater(job: Job<unknown>, plugins: PluginStartDeps) {
  switch (CONFIGURED_ADAPTER) {
    case 'taskManager':
      taskManager.enqueueAdater(job, plugins);
      break;
    case 'rabbitmq':
      rabbitmq.enqueueAdater(job, plugins);
      break;
  }
}

export function bulkEnqueueAdapter(jobs: Array<Job<unknown>>, plugins: PluginStartDeps) {
  switch (CONFIGURED_ADAPTER) {
    case 'taskManager':
      taskManager.bulkEnqueueAdapter(jobs, plugins);
      break;
    case 'rabbitmq':
      rabbitmq.bulkEnqueueAdapter(jobs, plugins);
      break;
  }
}
