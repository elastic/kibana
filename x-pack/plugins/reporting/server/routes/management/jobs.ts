/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { ReportingCore } from '../../';
import {
  IKibanaResponse,
  kibanaResponseFactory,
  ResponseError,
} from '../../../../../../src/core/server';
import { ROUTE_TAG_CAN_REDIRECT } from '../../../../security/server';
import { API_BASE_URL } from '../../../common/constants';
import { Report } from '../../lib/store';
import type { ReportApiJSON } from '../../lib/store/report';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';
import { jobsQueryFactory } from '../lib/jobs_query';
import { deleteJobResponseHandler, downloadJobResponseHandler } from '../lib/job_response_handler';
import { handleUnavailable } from '../lib/request_handler';

const MAIN_ENTRY = `${API_BASE_URL}/jobs`;

export function registerJobInfoRoutes(reporting: ReportingCore) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;
  const jobsQuery = jobsQueryFactory(reporting);

  // list jobs in the queue, paginated
  router.get(
    {
      path: `${MAIN_ENTRY}/list`,
      validate: {
        query: schema.object({
          page: schema.string({ defaultValue: '0' }),
          size: schema.string({ defaultValue: '10' }),
          ids: schema.maybe(schema.string()),
        }),
      },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();
      const { page: queryPage = '0', size: querySize = '10', ids: queryIds = null } = req.query;
      const page = parseInt(queryPage, 10) || 0;
      const size = Math.min(100, parseInt(querySize, 10) || 10);
      const jobIds = queryIds ? queryIds.split(',') : null;
      const results = await jobsQuery.list(jobTypes, user, page, size, jobIds);

      return res.ok({
        body: results,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // return the count of all jobs in the queue
  router.get(
    {
      path: `${MAIN_ENTRY}/count`,
      validate: false,
    },
    authorizedUserPreRouting(reporting, async (user, context, _req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();

      const count = await jobsQuery.count(jobTypes, user);

      return res.ok({
        body: count.toString(),
        headers: {
          'content-type': 'text/plain',
        },
      });
    })
  );

  /**
   * Returns appropriate {@link IKibanaResponse<ResponseError>} if the requested job is not valid either because:
   * 1. It was not found
   * 2. It is not permitted under the current licensing
   */
  const validateJobIsAvailable = async (
    job?: Report | ReportApiJSON
  ): Promise<undefined | IKibanaResponse<ResponseError>> => {
    if (!job) {
      // Bad result
      return kibanaResponseFactory.notFound();
    }

    const { jobtype: jobType } = job;
    const {
      management: { jobTypes = [] },
    } = await reporting.getLicenseInfo();

    if (!jobTypes.includes(jobType)) {
      // Bad result
      return kibanaResponseFactory.forbidden({
        body: i18n.translate('xpack.reporting.jobsQuery.infoError.unauthorizedErrorMessage', {
          defaultMessage: 'Sorry, you are not authorized to view {jobType} info',
          values: { jobType },
        }),
      });
    }

    // Good result
    return;
  };

  // return some info about the job
  router.get(
    {
      path: `${MAIN_ENTRY}/info/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 2 }),
        }),
      },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return res.custom({ statusCode: 503 });
      }

      const { docId } = req.params;

      const result = await jobsQuery.get(user, docId);

      const validationResult = await validateJobIsAvailable(result);
      if (validationResult) {
        return validationResult;
      }

      return res.ok({
        body: result!,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  router.get(
    {
      path: `${MAIN_ENTRY}/locatorParams/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 2 }),
        }),
      },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return res.custom({ statusCode: 503 });
      }

      const { docId } = req.params;

      const locatorParams = await jobsQuery.getLocatorParams(user, docId);

      if (!locatorParams || !locatorParams.length) {
        return res.notFound({
          body: {
            message: i18n.translate(
              'xpack.reporting.jobsQuery.locatorParams.notFoundErrorMessage',
              {
                defaultMessage: `Locator params not found for {docId}`,
                values: {
                  docId,
                },
              }
            ),
          },
        });
      }

      return res.ok({
        body: locatorParams,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // trigger a download of the output from a job
  router.get(
    {
      path: `${MAIN_ENTRY}/download/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 3 }),
        }),
      },
      options: { tags: [ROUTE_TAG_CAN_REDIRECT] },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const { docId } = req.params;
      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();

      return downloadJobResponseHandler(reporting, res, jobTypes, user, { docId });
    })
  );

  // allow a report to be deleted
  router.delete(
    {
      path: `${MAIN_ENTRY}/delete/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 3 }),
        }),
      },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const { docId } = req.params;
      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();

      return deleteJobResponseHandler(reporting, res, jobTypes, user, { docId });
    })
  );
}
