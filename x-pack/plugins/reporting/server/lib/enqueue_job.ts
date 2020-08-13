/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { ReportingCore } from '../';
import { AuthenticatedUser } from '../../../security/server';
import { CreateJobBaseParams, CreateJobFn } from '../types';
import { LevelLogger } from './';
import { Report } from './store';

export type EnqueueJobFn = (
  exportTypeId: string,
  jobParams: CreateJobBaseParams,
  user: AuthenticatedUser | null,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<Report>;

export function enqueueJobFactory(
  reporting: ReportingCore,
  parentLogger: LevelLogger
): EnqueueJobFn {
  const logger = parentLogger.clone(['queue-job']);

  return async function enqueueJob(
    exportTypeId: string,
    jobParams: CreateJobBaseParams,
    user: AuthenticatedUser | null,
    context: RequestHandlerContext,
    request: KibanaRequest
  ) {
    type ScheduleTaskFnType = CreateJobFn<CreateJobBaseParams>;

    const username: string | null = user ? user.username : null;
    const exportType = reporting.getExportTypesRegistry().getById(exportTypeId);

    if (exportType == null) {
      throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
    }

    const [scheduleTask, { store }] = await Promise.all([
      exportType.scheduleTaskFnFactory(reporting, logger) as ScheduleTaskFnType,
      reporting.getPluginStartDeps(),
    ]);

    // add encrytped headers
    const payload = await scheduleTask(jobParams, context, request);

    // store the pending report, puts it in the Reporting Management UI table
    const report = await store.addReport(exportType.jobType, username, payload);

    logger.info(`Scheduled ${exportType.name} report: ${report._id}`);

    return report;
  };
}
