/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { errors as elasticsearchErrors } from 'elasticsearch';
import { kibanaResponseFactory } from 'src/core/server';
import { ReportingCore } from '../';
import { API_BASE_URL } from '../../common/constants';
import { LevelLogger as Logger } from '../lib';
import { enqueueJobFactory } from '../lib/enqueue_job';
import { registerGenerateFromJobParams } from './generate_from_jobparams';
import { registerGenerateCsvFromSavedObjectImmediate } from './generate_from_savedobject_immediate';
import { HandlerFunction } from './types';

const esErrors = elasticsearchErrors as Record<string, any>;

const getDownloadBaseUrl = (reporting: ReportingCore) => {
  const config = reporting.getConfig();
  return config.kbnConfig.get('server', 'basePath') + `${API_BASE_URL}/jobs/download`;
};

export function registerJobGenerationRoutes(reporting: ReportingCore, logger: Logger) {
  /*
   * Generates enqueued job details to use in responses
   */
  const handler: HandlerFunction = async (user, exportTypeId, jobParams, context, req, res) => {
    // ensure the async dependencies are loaded
    if (!context.reporting) {
      return res.custom({ statusCode: 503, body: 'Not Available' });
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
      const enqueueJob = enqueueJobFactory(reporting, logger);
      const report = await enqueueJob(exportTypeId, jobParams, user, context, req);

      // return task manager's task information and the download URL
      const downloadBaseUrl = getDownloadBaseUrl(reporting);

      return res.ok({
        headers: {
          'content-type': 'application/json',
        },
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
  function handleError(res: typeof kibanaResponseFactory, err: Error | Boom.Boom) {
    if (err instanceof Boom.Boom) {
      return res.customError({
        statusCode: err.output.statusCode,
        body: err.output.payload.message,
      });
    }

    if (err instanceof esErrors['401']) {
      return res.unauthorized({
        body: `Sorry, you aren't authenticated`,
      });
    }

    if (err instanceof esErrors['403']) {
      return res.forbidden({
        body: `Sorry, you are not authorized`,
      });
    }

    if (err instanceof esErrors['404']) {
      return res.notFound({
        body: err.message,
      });
    }

    // unknown error, can't convert to 4xx
    throw err;
  }

  registerGenerateFromJobParams(reporting, handler, handleError);
  registerGenerateCsvFromSavedObjectImmediate(reporting, handleError, logger);
}
