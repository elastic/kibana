/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { events as esqueueEvents } from './esqueue';
import { oncePerServer } from './once_per_server';
import { LevelLogger } from './level_logger';

function createWorkerFn(server) {
  const config = server.config();
  const queueConfig = config.get('xpack.reporting.queue');
  const kibanaName = config.get('server.name');
  const kibanaId = config.get('server.uuid');
  const exportTypesRegistry = server.plugins.reporting.exportTypesRegistry;
  const logger = LevelLogger.createForServer(server, ['reporting', 'queue', 'worker']);

  // Once more document types are added, this will need to be passed in
  return function createWorker(queue) {
    // export type / execute job map
    const jobExectors = new Map();

    for (const exportType of exportTypesRegistry.getAll()) {
      const executeJob = exportType.executeJobFactory(server);
      jobExectors.set(exportType.jobType, executeJob);
    }

    const workerFn = (jobtype, payload, cancellationToken) => {
      // pass the work to the jobExector
      const jobExector = jobExectors.get(jobtype);
      return jobExector(payload, cancellationToken);
    };
    const workerOptions = {
      kibanaName,
      kibanaId,
      interval: queueConfig.pollInterval,
      intervalErrorMultiplier: queueConfig.pollIntervalErrorMultiplier,
    };
    const worker = queue.registerWorker('reporting', workerFn, workerOptions);

    worker.on(esqueueEvents.EVENT_WORKER_COMPLETE, res =>
      logger.debug(`Worker completed: (${res.job.id})`)
    );
    worker.on(esqueueEvents.EVENT_WORKER_JOB_EXECUTION_ERROR, res =>
      logger.debug(`Worker error: (${res.job.id})`)
    );
    worker.on(esqueueEvents.EVENT_WORKER_JOB_TIMEOUT, res =>
      logger.debug(`Job timeout exceeded: (${res.job.id})`)
    );
  };
}

export const createWorkerFactory = oncePerServer(createWorkerFn);
