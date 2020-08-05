/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CancellationToken } from '../../common';
import { PLUGIN_ID } from '../../common/constants';
import { ReportingCore } from '../../server';
import { LevelLogger } from '../../server/lib';
import { ESQueueWorkerExecuteFn, ExportTypeDefinition, JobSource } from '../../server/types';
import { ESQueueInstance } from './create_queue';
// @ts-ignore untyped dependency
import { events as esqueueEvents } from './esqueue';

export function createWorkerFactory<JobParamsType>(reporting: ReportingCore, logger: LevelLogger) {
  const config = reporting.getConfig();
  const queueConfig = config.get('queue');
  const kibanaName = config.kbnConfig.get('server', 'name');
  const kibanaId = config.kbnConfig.get('server', 'uuid');

  // Once more document types are added, this will need to be passed in
  return async function createWorker(queue: ESQueueInstance) {
    // export type / execute job map
    const jobExecutors: Map<string, ESQueueWorkerExecuteFn<unknown>> = new Map();

    for (const exportType of reporting.getExportTypesRegistry().getAll() as Array<
      ExportTypeDefinition<JobParamsType, unknown, unknown, ESQueueWorkerExecuteFn<unknown>>
    >) {
      const jobExecutor = exportType.runTaskFnFactory(reporting, logger);
      jobExecutors.set(exportType.jobType, jobExecutor);
    }

    const workerFn = <ScheduledTaskParamsType>(
      jobSource: JobSource<ScheduledTaskParamsType>,
      jobParams: ScheduledTaskParamsType,
      cancellationToken: CancellationToken
    ) => {
      const {
        _id: jobId,
        _source: { jobtype: jobType },
      } = jobSource;

      if (!jobId) {
        throw new Error(`Claimed job is missing an ID!: ${JSON.stringify(jobSource)}`);
      }

      const jobTypeExecutor = jobExecutors.get(jobType);
      if (!jobTypeExecutor) {
        throw new Error(`Unable to find a job executor for the claimed job: [${jobId}]`);
      }

      // pass the work to the jobExecutor
      return jobTypeExecutor(jobId, jobParams, cancellationToken);
    };

    const workerOptions = {
      kibanaName,
      kibanaId,
      interval: queueConfig.pollInterval,
      intervalErrorMultiplier: queueConfig.pollIntervalErrorMultiplier,
    };
    const worker = queue.registerWorker(PLUGIN_ID, workerFn, workerOptions);

    worker.on(esqueueEvents.EVENT_WORKER_COMPLETE, (res: any) => {
      logger.debug(`Worker completed: (${res.job.id})`);
    });
    worker.on(esqueueEvents.EVENT_WORKER_JOB_EXECUTION_ERROR, (res: any) => {
      logger.debug(`Worker error: (${res.job.id})`);
    });
    worker.on(esqueueEvents.EVENT_WORKER_JOB_TIMEOUT, (res: any) => {
      logger.debug(`Job timeout exceeded: (${res.job.id})`);
    });
  };
}
