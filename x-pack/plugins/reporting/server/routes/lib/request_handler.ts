/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { KibanaRequest, KibanaResponseFactory } from 'kibana/server';
import { ReportingCore } from '../..';
import { API_BASE_URL } from '../../../common/constants';
import { JobParamsPDFLegacy } from '../../export_types/printable_pdf/types';
import { LevelLogger } from '../../lib';
import { enqueueJob } from '../../lib/enqueue_job';
import { BaseParams, ReportingRequestHandlerContext, ReportingUser } from '../../types';

export const handleUnavailable = (res: KibanaResponseFactory) => {
  return res.custom({ statusCode: 503, body: 'Not Available' });
};

const getDownloadBaseUrl = (reporting: ReportingCore) => {
  const config = reporting.getConfig();
  return config.kbnConfig.get('server', 'basePath') + `${API_BASE_URL}/jobs/download`;
};

export class RequestHandler {
  constructor(
    private reporting: ReportingCore,
    private user: ReportingUser,
    private context: ReportingRequestHandlerContext,
    private req: KibanaRequest,
    private res: KibanaResponseFactory,
    private logger: LevelLogger
  ) {}

  public async handleGenerateRequest(
    exportTypeId: string,
    jobParams: BaseParams | JobParamsPDFLegacy
  ) {
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

    try {
      const report = await enqueueJob(
        this.reporting,
        this.req,
        this.context,
        this.user,
        exportTypeId,
        jobParams,
        this.logger
      );

      // return task manager's task information and the download URL
      const downloadBaseUrl = getDownloadBaseUrl(this.reporting);

      return this.res.ok({
        headers: { 'content-type': 'application/json' },
        body: {
          path: `${downloadBaseUrl}/${report._id}`,
          job: report.toApiJSON(),
        },
      });
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  /*
   * This method does not log the error, as it assumes the error has already
   * been caught and logged for stack trace context, and then rethrown
   */
  public handleError(err: Error | Boom.Boom) {
    if (err instanceof Boom.Boom) {
      return this.res.customError({
        statusCode: err.output.statusCode,
        body: err.output.payload.message,
      });
    }

    // unknown error, can't convert to 4xx
    throw err;
  }
}
