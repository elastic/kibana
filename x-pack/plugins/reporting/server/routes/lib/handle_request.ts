/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from 'kibana/server';
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

export type HandlerFunction = (
  reporting: ReportingCore,
  user: ReportingUser,
  exportType: string,
  jobParams: BaseParams | JobParamsPDFLegacy,
  context: ReportingRequestHandlerContext,
  req: KibanaRequest,
  res: KibanaResponseFactory,
  logger: LevelLogger
) => Promise<IKibanaResponse>;

export type HandleErrorFunction = (res: KibanaResponseFactory, err: Error) => IKibanaResponse;

export const handleGenerateRequest: HandlerFunction = async (
  reporting,
  user,
  exportTypeId,
  jobParams,
  context,
  req,
  res,
  logger
) => {
  // ensure the async dependencies are loaded
  if (!context.reporting) {
    return handleUnavailable(res);
  }

  const licenseInfo = await reporting.getLicenseInfo();
  const licenseResults = licenseInfo[exportTypeId];

  if (!licenseResults) {
    return res.badRequest({ body: `Invalid export-type of ${exportTypeId}` });
  }

  if (!licenseResults.enableLinks) {
    return res.forbidden({ body: licenseResults.message });
  }

  try {
    const report = await enqueueJob(reporting, req, context, user, exportTypeId, jobParams, logger);

    // return task manager's task information and the download URL
    const downloadBaseUrl = getDownloadBaseUrl(reporting);

    return res.ok({
      headers: { 'content-type': 'application/json' },
      body: {
        path: `${downloadBaseUrl}/${report._id}`,
        job: report.toApiJSON(),
      },
    });
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

/*
 * Error should already have been logged by the time we get here
 */
export const handleError: HandleErrorFunction = (
  res: KibanaResponseFactory,
  err: Error | Boom.Boom
) => {
  if (err instanceof Boom.Boom) {
    return res.customError({
      statusCode: err.output.statusCode,
      body: err.output.payload.message,
    });
  }

  // unknown error, can't convert to 4xx
  throw err;
};
