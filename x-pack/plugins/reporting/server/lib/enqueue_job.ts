/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/server';
import { ESQueueCreateJobFn } from '../../server/types';
import { ReportingCore } from '../core';
// @ts-ignore
import { events as esqueueEvents } from './esqueue';
import { LevelLogger } from './level_logger';

interface ConfirmedJob {
  id: string;
  index: string;
  _seq_no: number;
  _primary_term: number;
}

export type Job = EventEmitter & {
  id: string;
  toJSON: () => {
    id: string;
  };
};

export type EnqueueJobFn = <JobParamsType>(
  exportTypeId: string,
  jobParams: JobParamsType,
  user: AuthenticatedUser | null,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<Job>;

export function enqueueJobFactory(
  reporting: ReportingCore,
  parentLogger: LevelLogger
): EnqueueJobFn {
  const config = reporting.getConfig();
  const queueTimeout = config.get('queue', 'timeout');
  const browserType = config.get('capture', 'browser', 'type');
  const maxAttempts = config.get('capture', 'maxAttempts');
  const logger = parentLogger.clone(['queue-job']);

  return async function enqueueJob<JobParamsType>(
    exportTypeId: string,
    jobParams: JobParamsType,
    user: AuthenticatedUser | null,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<Job> {
    type ScheduleTaskFnType = ESQueueCreateJobFn<JobParamsType>;
    const username = user ? user.username : false;
    const esqueue = await reporting.getEsqueue();
    const exportType = reporting.getExportTypesRegistry().getById(exportTypeId);

    if (exportType == null) {
      throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
    }

    const scheduleTask = exportType.scheduleTaskFnFactory(reporting, logger) as ScheduleTaskFnType;
    const payload = await scheduleTask(jobParams, context, request);

    const options = {
      timeout: queueTimeout,
      created_by: username,
      browser_type: browserType,
      max_attempts: maxAttempts,
    };

    return new Promise((resolve, reject) => {
      const job = esqueue.addJob(exportType.jobType, payload, options);

      job.on(esqueueEvents.EVENT_JOB_CREATED, (createdJob: ConfirmedJob) => {
        if (createdJob.id === job.id) {
          logger.info(`Successfully queued job: ${createdJob.id}`);
          resolve(job);
        }
      });
      job.on(esqueueEvents.EVENT_JOB_CREATE_ERROR, reject);
    });
  };
}
