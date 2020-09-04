/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { ReportingCore } from '../';
import { BaseParams, CreateJobFn, ReportingUser } from '../types';
import { LevelLogger } from './';
import { Report } from './store';

export type EnqueueJobFn = (
  exportTypeId: string,
  jobParams: BaseParams,
  user: ReportingUser,
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
    jobParams: BaseParams,
    user: ReportingUser,
    context: RequestHandlerContext,
    request: KibanaRequest
  ) {
    type CreateJobFnType = CreateJobFn<BaseParams>;

    const exportType = reporting.getExportTypesRegistry().getById(exportTypeId);

    if (exportType == null) {
      throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
    }

    const [createJob, { store }] = await Promise.all([
      exportType.createJobFnFactory(reporting, logger) as CreateJobFnType,
      reporting.getPluginStartDeps(),
    ]);

    // add encrytped headers
    const payload = await createJob(jobParams, context, request);

    // store the pending report, puts it in the Reporting Management UI table
    const report = await store.addReport(exportType.jobType, user, payload);

    logger.info(`Scheduled ${exportType.name} report: ${report._id}`);

    return report;
  };
}
