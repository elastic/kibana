/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { ReportingCore } from '../';
import type { BasePayload, ReportingRequestHandlerContext } from '../types';
import { BaseParams, ReportingUser } from '../types';
import { checkParamsVersion, cryptoFactory, LevelLogger } from './';
import { Report } from './store';

export async function enqueueJob(
  reporting: ReportingCore,
  request: KibanaRequest,
  context: ReportingRequestHandlerContext,
  user: ReportingUser,
  exportTypeId: string,
  jobParams: BaseParams,
  parentLogger: LevelLogger
): Promise<Report> {
  const logger = parentLogger.clone(['createJob']);
  const exportType = reporting.getExportTypesRegistry().getById(exportTypeId);

  if (exportType == null) {
    throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
  }

  if (!exportType.createJobFnFactory) {
    throw new Error(`Export type ${exportTypeId} is not an async job type!`);
  }

  const [createJob, store] = await Promise.all([
    exportType.createJobFnFactory(reporting, logger.clone([exportType.id])),
    reporting.getStore(),
  ]);

  // 1. encrypt request headers for the running report job to authenticate itself with Kibana
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));
  const serializedEncryptedHeaders = await crypto.encrypt(request.headers);

  jobParams.version = checkParamsVersion(jobParams, logger);

  // 2. create the payload with the queued job info
  const job: BasePayload = {
    ...(await createJob!(jobParams, context)),
    headers: serializedEncryptedHeaders,
    spaceId: reporting.getSpaceId(request, logger),
  };

  // 3. Add the report to ReportingStore to show as pending
  const report = await store.addReport(
    new Report({
      jobtype: exportType.jobType,
      created_by: user ? user.username : false,
      payload: job,
      meta: {
        // telemetry fields
        objectType: jobParams.objectType,
        layout: jobParams.layout?.id,
        isDeprecated: job.isDeprecated,
      },
    })
  );
  logger.debug(`Successfully stored pending job: ${report._index}/${report._id}`);

  // 4. Schedule the report with Task Manager
  const task = await reporting.scheduleTask(report.toReportTaskJSON());
  logger.info(
    `Scheduled ${exportType.name} reporting task. Task ID: task:${task.id}. Report ID: ${report._id}`
  );

  return report;
}
