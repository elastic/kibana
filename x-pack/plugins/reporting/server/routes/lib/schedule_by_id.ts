/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { KibanaRequest } from 'kibana/server';
import { ReportingCore } from '../..';
import { cryptoFactory } from '../../lib';
import { ScheduledReportTaskParams } from '../../lib/tasks';
import { ScheduleReportByIdSchema } from '../../lib/tasks';
import { ReportingUser } from '../../types';
import { BadRequestError } from './errors';
import { jobsQueryFactory } from './jobs_query';

export async function scheduleReportById(
  reporting: ReportingCore,
  req: KibanaRequest<unknown, unknown, TypeOf<typeof ScheduleReportByIdSchema>>,
  user: ReportingUser
) {
  const jobsQuery = jobsQueryFactory(reporting);
  const config = reporting.getConfig();
  const encryptionKey = config.get('encryptionKey');
  const crypto = cryptoFactory(encryptionKey);

  const { report_id: reportId, schedule, api_key: apiKey } = req.body;

  // fetch the job params of the report
  const report = await jobsQuery.get(user, reportId);

  if (!report) {
    throw new BadRequestError(
      `Unable to create a schedule of an existing report: Invalid report ID: [${reportId}]`
    );
  }

  if (report.payload.isDeprecated) {
    throw new BadRequestError(`Unable to schedule a deprecated report type!`);
  }

  // check if `reporting.roles.enabled: false` is set
  if (config.get('roles', 'enabled')) {
    throw new BadRequestError(
      `Kibana config must have 'xpack.reporting.roles.enabled: false' set in order for API keys to authenticate report generation.`
    );
  }

  // strip forceNow from the payload
  const { forceNow: _forceNow, ...reportPayload } = report.payload;

  // use the provided API Key
  const encryptedHeaders = await crypto.encrypt({ authorization: `ApiKey ${apiKey.base64}` });

  const scheduledTask: ScheduledReportTaskParams = {
    jobtype: report.jobtype,
    created_by: report.created_by,
    schedule,
    payload: {
      headers: encryptedHeaders,
      ...reportPayload,
    },
  };

  // schedule the task with task manager
  return await reporting.scheduleTask(scheduledTask);
}
