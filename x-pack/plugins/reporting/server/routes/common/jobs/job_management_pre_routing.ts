/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { IKibanaResponse, kibanaResponseFactory } from '@kbn/core/server';
import { JobId, ReportApiJSON } from '@kbn/reporting-common/types';
import { i18n } from '@kbn/i18n';
import { Counters } from '..';
import { ReportingCore } from '../../..';
import { ReportingUser } from '../../../types';
import { jobsQueryFactory } from './jobs_query';

/**
 * The body of a route handler to call via callback
 */
type JobManagementResponseHandler = (doc: ReportApiJSON) => Promise<IKibanaResponse<object>>;

/**
 * Handles the common parts of requests to manage (view, download and delete) reports
 */
export const jobManagementPreRouting = async (
  reporting: ReportingCore,
  res: typeof kibanaResponseFactory,
  jobId: JobId,
  user: ReportingUser,
  counters: Counters,
  { isInternal }: { isInternal: boolean },
  cb: JobManagementResponseHandler
) => {
  const jobsQuery = jobsQueryFactory(reporting, { isInternal });

  const doc = await jobsQuery.get(user, jobId);
  if (!doc) {
    return res.notFound();
  }

  const { jobtype } = doc;
  counters.usageCounter(jobtype);

  try {
    return await cb(doc);
  } catch (err) {
    const { logger } = reporting.getPluginSetupDeps();
    logger.error(err);
    if (err instanceof Boom.Boom) {
      const statusCode = err.output.statusCode;
      counters?.errorCounter(jobtype, statusCode);
      return res.customError({
        statusCode,
        body: err.output.payload.message,
      });
    }

    counters?.errorCounter(jobtype, 500);
    return res.customError({
      statusCode: 500,
      body:
        err?.message ||
        i18n.translate('xpack.reporting.jobResponse.errorHandler.unknownError', {
          defaultMessage: 'Unknown error',
        }),
    });
  }
};
