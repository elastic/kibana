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
  const logger = parentLogger.clone(['createJob']);
  return async function enqueueJob(
    exportTypeId: string,
    jobParams: BaseParams,
    user: ReportingUser,
    context: ReportingRequestHandlerContext,
    request: KibanaRequest
  ) {
    const exportType = reporting.getExportTypesRegistry().getById(exportTypeId);

    if (exportType == null) {
      throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
    }

    const [createJob, store] = await Promise.all([
      exportType.createJobFnFactory(reporting, logger.clone([exportType.id])),
      reporting.getStore(),
    ]);

    const config = reporting.getConfig();
    const job = await createJob(jobParams, context, request);

    // 1. Add the report to ReportingStore to show as pending
    const report = await store.addReport(
      new Report({
        jobtype: exportType.jobType,
        created_by: user ? user.username : false,
        max_attempts: config.get('capture', 'maxAttempts'), // NOTE: since max attempts is stored in the document, changing the capture.maxAttempts setting does not affect existing pending reports
        payload: job,
        meta: {
          objectType: jobParams.objectType,
          layout: jobParams.layout?.id,
        },
      })
    );
    logger.debug(`Successfully stored pending job: ${report._index}/${report._id}`);

    // 2. Schedule the report with Task Manager
    const task = await reporting.scheduleTask(report.toReportTaskJSON());
    logger.info(
      `Scheduled ${exportType.name} reporting task. Task ID: ${task.id}. Report ID: ${report._id}`
    );

    return report;
  };
}
