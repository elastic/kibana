/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../core';
import { createWorkerFactory } from './create_worker';
// @ts-ignore
import { Esqueue } from './esqueue';
import { createTaggedLogger } from './esqueue/create_tagged_logger';
import { LevelLogger } from './level_logger';
import { ReportDocument, ReportingStore } from './store';
import { TaskRunResult } from './tasks';

interface ESQueueWorker {
  on: (event: string, handler: any) => void;
}

export interface ESQueueInstance {
  registerWorker: <JobParamsType>(
    pluginId: string,
    workerFn: GenericWorkerFn<JobParamsType>,
    workerOptions: {
      kibanaName: string;
      kibanaId: string;
      interval: number;
      intervalErrorMultiplier: number;
    }
  ) => ESQueueWorker;
}

// GenericWorkerFn is a generic for ImmediateExecuteFn<JobParamsType> | ESQueueWorkerExecuteFn<ScheduledTaskParamsType>,
type GenericWorkerFn<JobParamsType> = (
  jobSource: ReportDocument,
  ...workerRestArgs: any[]
) => void | Promise<TaskRunResult>;

export async function createQueueFactory(
  reporting: ReportingCore,
  store: ReportingStore,
  logger: LevelLogger
): Promise<ESQueueInstance> {
  const config = reporting.getConfig();

  // esqueue-related
  const queueTimeout = config.get('queue', 'timeout');
  const isPollingEnabled = config.get('queue', 'pollEnabled');

  const elasticsearch = reporting.getElasticsearchService();
  const queueOptions = {
    timeout: queueTimeout,
    client: elasticsearch.legacy.client,
    logger: createTaggedLogger(logger, ['esqueue', 'queue-worker']),
  };

  const queue: ESQueueInstance = new Esqueue(store, queueOptions);

  if (isPollingEnabled) {
    // create workers to poll the index for idle jobs waiting to be claimed and executed
    const createWorker = createWorkerFactory(reporting, logger);
    await createWorker(queue);
  } else {
    logger.info(
      'xpack.reporting.queue.pollEnabled is set to false. This Kibana instance ' +
        'will not poll for idle jobs to claim and execute. Make sure another ' +
        'Kibana instance with polling enabled is running in this cluster so ' +
        'reporting jobs can complete.',
      ['create_queue']
    );
  }

  return queue;
}
