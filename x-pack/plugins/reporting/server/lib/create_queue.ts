/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../core';
import { JobSource, TaskRunResult } from '../types';
import { createTaggedLogger } from './create_tagged_logger'; // TODO remove createTaggedLogger once esqueue is removed
import { createWorkerFactory } from './create_worker';
import { Job } from './enqueue_job';
// @ts-ignore
import { Esqueue } from './esqueue';
import { LevelLogger } from './level_logger';

interface ESQueueWorker {
  on: (event: string, handler: any) => void;
}

export interface ESQueueInstance {
  addJob: (type: string, payload: unknown, options: object) => Job;
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
  jobSource: JobSource<JobParamsType>,
  ...workerRestArgs: any[]
) => void | Promise<TaskRunResult>;

export async function createQueueFactory<JobParamsType, JobPayloadType>(
  reporting: ReportingCore,
  logger: LevelLogger
): Promise<ESQueueInstance> {
  const config = reporting.getConfig();
  const queueIndexInterval = config.get('queue', 'indexInterval');
  const queueTimeout = config.get('queue', 'timeout');
  const queueIndex = config.get('index');
  const isPollingEnabled = config.get('queue', 'pollEnabled');

  const elasticsearch = await reporting.getElasticsearchService();
  const queueOptions = {
    interval: queueIndexInterval,
    timeout: queueTimeout,
    dateSeparator: '.',
    client: elasticsearch.legacy.client,
    logger: createTaggedLogger(logger, ['esqueue', 'queue-worker']),
  };

  const queue: ESQueueInstance = new Esqueue(queueIndex, queueOptions);

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
