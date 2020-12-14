/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { ReportingCore } from '../';
import { BaseParams, ReportingUser } from '../types';
import { LevelLogger } from './';
import { Report } from './store';
import type { ReportingRequestHandlerContext } from '../types';

export type EnqueueJobFn = (
  exportTypeId: string,
  jobParams: BaseParams,
  user: ReportingUser,
  context: ReportingRequestHandlerContext,
  request: KibanaRequest
) => Promise<Report>;

export function enqueueJobFactory(
  reporting: ReportingCore,
  parentLogger: LevelLogger
): EnqueueJobFn {
  return async function enqueueJob(
    exportTypeId: string,
    jobParams: BaseParams,
    user: ReportingUser,
    context: ReportingRequestHandlerContext,
    request: KibanaRequest
  ) {
    const logger = parentLogger.clone([exportTypeId, 'queue-job']);
    const exportType = reporting.getExportTypesRegistry().getById(exportTypeId);

    if (exportType == null) {
      throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
    }

    const [createJob, store] = await Promise.all([
      exportType.createJobFnFactory(reporting, logger),
      reporting.getStore(),
    ]);

    const job = await createJob(jobParams, context, request);

    // 1. Add the report to ReportingStore to show as pending
    const pendingReport = await store.addReport(
      new Report({
        jobtype: exportType.jobType,
        created_by: user ? user.username : false,
        payload: job,
        meta: {
          objectType: jobParams.objectType,
          layout: jobParams.layout?.id,
        },
      })
    );

    // 2. Schedule the report with Task Manager
    const task = await reporting.scheduleTask(pendingReport.toReportTaskJSON());
    logger.info(`Scheduled ${exportType.name} reporting task: ${task.id}`);

    return pendingReport;
  };
}
