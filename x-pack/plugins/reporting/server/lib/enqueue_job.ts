/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/server';
import { ESQueueCreateJobFn } from '../../server/types';
import { ReportingCore } from '../core';
import { LevelLogger } from './';
import { ReportingStore, Report } from './store';

export type EnqueueJobFn = (
  exportTypeId: string,
  jobParams: unknown,
  user: AuthenticatedUser | null,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<Report>;

export function enqueueJobFactory(
  reporting: ReportingCore,
  store: ReportingStore,
  parentLogger: LevelLogger
): EnqueueJobFn {
  const config = reporting.getConfig();
  const queueTimeout = config.get('queue', 'timeout');
  const browserType = config.get('capture', 'browser', 'type');
  const maxAttempts = config.get('capture', 'maxAttempts');
  const logger = parentLogger.clone(['queue-job']);

  return async function enqueueJob(
    exportTypeId: string,
    jobParams: unknown,
    user: AuthenticatedUser | null,
    context: RequestHandlerContext,
    request: KibanaRequest
  ) {
    type ScheduleTaskFnType = ESQueueCreateJobFn<unknown>;

    const username = user ? user.username : false;
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

    return await store.addReport(exportType.jobType, payload, options);
  };
}
