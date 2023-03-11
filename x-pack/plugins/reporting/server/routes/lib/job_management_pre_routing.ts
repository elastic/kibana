/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { IKibanaResponse, kibanaResponseFactory } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { jobsQueryFactory } from '.';
import { ReportingCore } from '../..';
import { ReportApiJSON } from '../../lib/store/report';
import { ReportingUser } from '../../types';
import type { Counters } from './get_counter';

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
  docId: string,
  user: ReportingUser,
  counters: Counters,
  cb: JobManagementResponseHandler
) => {
  const licenseInfo = await reporting.getLicenseInfo();
  const {
    management: { jobTypes = [] },
  } = licenseInfo;

  const jobsQuery = jobsQueryFactory(reporting);

  const doc = await jobsQuery.get(user, docId);
  if (!doc) {
    return res.notFound();
  }

  const { jobtype } = doc;
  if (!jobTypes.includes(jobtype)) {
    return res.forbidden({
      body: i18n.translate('xpack.reporting.jobResponse.errorHandler.notAuthorized', {
        defaultMessage: `Sorry, you are not authorized to view or delete {jobtype} reports`,
        values: { jobtype },
      }),
    });
  }

  // Count usage once allowing the request
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
