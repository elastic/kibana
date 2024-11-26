/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import moment from 'moment';

import { schema, TypeOf } from '@kbn/config-schema';
import { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { PUBLIC_ROUTES } from '@kbn/reporting-common';
import type { BaseParams } from '@kbn/reporting-common/types';
import { cryptoFactory } from '@kbn/reporting-server';
import rison from '@kbn/rison';

import { type Counters, getCounters } from '..';
import type { ReportingCore } from '../../..';
import { checkParamsVersion } from '../../../lib';
import { Report } from '../../../lib/store';
import type {
  ReportingJobResponse,
  ReportingRequestHandlerContext,
  ReportingUser,
} from '../../../types';

export const handleUnavailable = (res: KibanaResponseFactory) => {
  return res.custom({ statusCode: 503, body: 'Not Available' });
};

const validation = {
  params: schema.object({ exportType: schema.string({ minLength: 2 }) }),
  body: schema.nullable(schema.object({ jobParams: schema.maybe(schema.string()) })),
  query: schema.nullable(schema.object({ jobParams: schema.string({ defaultValue: '' }) })),
};

/**
 * Handles the common parts of requests to generate a report
 * Serves report job handling in the context of the request to generate the report
 */
export class RequestHandler {
  constructor(
    private reporting: ReportingCore,
    private user: ReportingUser,
    private context: ReportingRequestHandlerContext,
    private path: string,
    private req: KibanaRequest<
      TypeOf<(typeof validation)['params']>,
      TypeOf<(typeof validation)['query']>,
      TypeOf<(typeof validation)['body']>
    >,
    private res: KibanaResponseFactory,
    private logger: Logger
  ) {}

  private async encryptHeaders(): Promise<{
    encryptedHeaders: string;
    usesDedicatedApiKey: boolean;
  }> {
    const { headers, usesDedicatedApiKey } = await this.reporting.prepareReportHeaders(this.req);
    return {
      usesDedicatedApiKey,
      encryptedHeaders: await cryptoFactory(this.reporting.getConfig().encryptionKey).encrypt(
        headers
      ),
    };
  }

  public async enqueueJob(exportTypeId: string, jobParams: BaseParams) {
    const { reporting, logger, context, req, user } = this;

    const exportType = reporting.getExportTypesRegistry().getById(exportTypeId);

    if (exportType == null) {
      throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
    }

    const store = await reporting.getStore();

    if (!exportType.createJob) {
      throw new Error(`Export type ${exportTypeId} is not a valid instance!`);
    }

    // 1. Ensure the incoming params have a version field (should be set by the UI)
    jobParams.version = checkParamsVersion(jobParams, logger);

    // 2. Encrypt request headers to store for the running report job to authenticate itself with Kibana
    // IMPORTANT: We need to store `usesDedicatedApiKey` flag in the report so we can determine if we need to invalidate
    // the API key after the report is completed:
    // const decryptedHeaders = ....;
    // await this.reporting.disposeHeaders({ usesDedicatedApiKey, headers: decryptedHeaders });
    const { usesDedicatedApiKey, encryptedHeaders } = await this.encryptHeaders();

    // 3. Create a payload object by calling exportType.createJob(), and adding some automatic parameters
    const job = await exportType.createJob(jobParams, context, req);

    const payload = {
      ...job,
      headers: encryptedHeaders,
      title: job.title,
      objectType: jobParams.objectType,
      browserTimezone: jobParams.browserTimezone,
      version: jobParams.version,
      spaceId: reporting.getSpaceId(req, logger),
    };

    // 4. Add the report to ReportingStore to show as pending
    const report = await store.addReport(
      new Report({
        jobtype: exportType.jobType,
        created_by: user ? user.username : false,
        payload,
        migration_version: jobParams.version,
        meta: {
          // telemetry fields
          objectType: jobParams.objectType,
          layout: jobParams.layout?.id,
          isDeprecated: job.isDeprecated,
        },
      })
    );
    logger.debug(`Successfully stored pending job: ${report._index}/${report._id}`);

    // 5. Schedule the report with Task Manager
    const task = await reporting.scheduleTask(report.toReportTaskJSON());
    logger.info(
      `Scheduled ${exportType.name} reporting task. Task ID: task:${task.id}. Report ID: ${report._id}`
    );

    // 6. Log the action with event log
    reporting.getEventLogger(report, task).logScheduleTask();
    return report;
  }

  public getJobParams(): BaseParams {
    let jobParamsRison: null | string = null;
    const req = this.req;
    const res = this.res;

    if (req.body) {
      const { jobParams: jobParamsPayload } = req.body;
      jobParamsRison = jobParamsPayload ? jobParamsPayload : null;
    } else if (req.query?.jobParams) {
      const { jobParams: queryJobParams } = req.query;
      if (queryJobParams) {
        jobParamsRison = queryJobParams;
      } else {
        jobParamsRison = null;
      }
    }

    if (!jobParamsRison) {
      throw res.customError({
        statusCode: 400,
        body: 'A jobParams RISON string is required in the querystring or POST body',
      });
    }

    let jobParams;

    try {
      jobParams = rison.decode(jobParamsRison) as BaseParams | null;
      if (!jobParams) {
        throw res.customError({
          statusCode: 400,
          body: 'Missing jobParams!',
        });
      }
    } catch (err) {
      throw res.customError({
        statusCode: 400,
        body: `invalid rison: ${jobParamsRison}`,
      });
    }

    return jobParams;
  }

  public static getValidation() {
    return validation;
  }

  public async handleGenerateRequest(exportTypeId: string, jobParams: BaseParams) {
    const req = this.req;
    const reporting = this.reporting;

    const counters = getCounters(
      req.route.method,
      this.path.replace(/{exportType}/, exportTypeId),
      reporting.getUsageCounter()
    );

    // ensure the async dependencies are loaded
    if (!this.context.reporting) {
      return handleUnavailable(this.res);
    }

    const licenseInfo = await this.reporting.getLicenseInfo();
    const licenseResults = licenseInfo[exportTypeId];

    if (!licenseResults) {
      return this.res.badRequest({ body: `Invalid export-type of ${exportTypeId}` });
    }

    if (!licenseResults.enableLinks) {
      return this.res.forbidden({ body: licenseResults.message });
    }

    if (jobParams.browserTimezone && !moment.tz.zone(jobParams.browserTimezone)) {
      return this.res.badRequest({
        body: `Invalid timezone "${jobParams.browserTimezone ?? ''}".`,
      });
    }

    let report: Report | undefined;
    try {
      report = await this.enqueueJob(exportTypeId, jobParams);
      const { basePath } = this.reporting.getServerInfo();
      const publicDownloadPath = basePath + PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX;

      // return task manager's task information and the download URL
      counters.usageCounter();
      const eventTracker = reporting.getEventTracker(
        report._id,
        exportTypeId,
        jobParams.objectType
      );
      eventTracker?.createReport({
        isDeprecated: Boolean(report.payload.isDeprecated),
        isPublicApi: this.path.match(/internal/) === null,
      });

      return this.res.ok<ReportingJobResponse>({
        headers: { 'content-type': 'application/json' },
        body: {
          path: `${publicDownloadPath}/${report._id}`,
          job: report.toApiJSON(),
        },
      });
    } catch (err) {
      return this.handleError(err, counters, report?.jobtype);
    }
  }

  private handleError(err: Error | Boom.Boom, counters: Counters, jobtype?: string) {
    this.logger.error(err);

    if (err instanceof Boom.Boom) {
      const statusCode = err.output.statusCode;
      counters?.errorCounter(jobtype, statusCode);

      return this.res.customError({
        statusCode,
        body: err.output.payload.message,
      });
    }

    counters?.errorCounter(jobtype, 500);

    return this.res.customError({
      statusCode: 500,
      body:
        err?.message ||
        i18n.translate('xpack.reporting.errorHandler.unknownError', {
          defaultMessage: 'Unknown error',
        }),
    });
  }
}
