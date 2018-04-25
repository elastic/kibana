/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { events as esqueueEvents } from './esqueue';
import { oncePerServer } from './once_per_server';

function createWorkersFn(server) {
  const queueConfig = server.config().get('xpack.reporting.queue');
  const exportTypesRegistry = server.plugins.reporting.exportTypesRegistry;

  // Once more document types are added, this will need to be passed in
  return function createWorkers(queue) {
    for (const exportType of exportTypesRegistry.getAll()) {
      const log = (msg) => {
        server.log(['reporting', 'worker', 'debug'], `${exportType.name}: ${msg}`);
      };

      log(`Registering ${exportType.name} worker`);
      const executeJob = exportType.executeJobFactory(server);
      const workerFn = (payload, cancellationToken) => {
        log(`Processing ${exportType.name} job`);
        return executeJob(payload, cancellationToken);
      };
      const workerOptions = {
        interval: queueConfig.pollInterval,
        intervalErrorMultiplier: queueConfig.pollIntervalErrorMultiplier,
      };
      const worker = queue.registerWorker(exportType.jobType, workerFn, workerOptions);

      worker.on(esqueueEvents.EVENT_WORKER_COMPLETE, (res) => log(`Worker completed: (${res.job.id})`));
      worker.on(esqueueEvents.EVENT_WORKER_JOB_EXECUTION_ERROR, (res) => log(`Worker error: (${res.job.id})`));
      worker.on(esqueueEvents.EVENT_WORKER_JOB_TIMEOUT, (res) => log(`Job timeout exceeded: (${res.job.id})`));
    }
  };
}

export const createWorkersFactory = oncePerServer(createWorkersFn);
