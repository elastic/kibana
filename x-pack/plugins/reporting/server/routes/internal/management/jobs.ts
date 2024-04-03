/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { ROUTE_TAG_CAN_REDIRECT } from '@kbn/security-plugin/server';
import { ReportingCore } from '../../..';
import { authorizedUserPreRouting, getCounters } from '../../common';
import { handleUnavailable } from '../../common/generate';
import {
  commonJobsRouteHandlerFactory,
  jobManagementPreRouting,
  jobsQueryFactory,
} from '../../common/jobs';

const { JOBS } = INTERNAL_ROUTES;

export function registerJobInfoRoutesInternal(reporting: ReportingCore) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;
  const jobsQuery = jobsQueryFactory(reporting);

  const registerInternalGetList = () => {
    // list jobs in the queue, paginated
    const path = JOBS.LIST;
    router.get(
      {
        path,
        validate: {
          query: schema.object({
            page: schema.string({ defaultValue: '0' }),
            size: schema.string({ defaultValue: '10' }),
            ids: schema.maybe(schema.string()),
          }),
        },
        options: { access: 'internal' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

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

        counters.usageCounter();

        return res.ok({
          body: results,
          headers: {
            'content-type': 'application/json',
          },
        });
      })
    );
  };

  const registerInternalGetCount = () => {
    // return the count of all jobs in the queue
    const path = JOBS.COUNT;

    router.get(
      {
        path,
        validate: false,
        options: { access: 'internal' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        // ensure the async dependencies are loaded
        if (!context.reporting) {
          return handleUnavailable(res);
        }

        const {
          management: { jobTypes = [] },
        } = await reporting.getLicenseInfo();

        const count = await jobsQuery.count(jobTypes, user);

        counters.usageCounter();

        return res.ok({
          body: count.toString(),
          headers: {
            'content-type': 'text/plain',
          },
        });
      })
    );
  };

  // use common route handlers that are shared for public and internal routes
  const jobHandlers = commonJobsRouteHandlerFactory(reporting);

  const registerInternalGetInfo = () => {
    // return some info about the job
    const path = `${JOBS.INFO_PREFIX}/{docId}`;

    router.get(
      {
        path,
        validate: jobHandlers.validate,
        options: { access: 'internal' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        // ensure the async dependencies are loaded
        if (!context.reporting) {
          return res.custom({ statusCode: 503 });
        }

        const { docId } = req.params;
        return jobManagementPreRouting(reporting, res, docId, user, counters, async (doc) =>
          res.ok({
            body: doc,
            headers: {
              'content-type': 'application/json',
            },
          })
        );
      })
    );
  };

  const registerInternalDownloadReport = () => {
    // trigger a download of the output from a job
    const path = `${JOBS.DOWNLOAD_PREFIX}/{docId}`;

    router.get(
      {
        path,
        validate: jobHandlers.validate,
        options: { tags: [ROUTE_TAG_CAN_REDIRECT], access: 'internal' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        return jobHandlers.handleDownloadReport({ path, user, context, req, res });
      })
    );
  };

  const registerInternalDeleteReport = () => {
    // allow a report to be deleted
    const path = `${JOBS.DELETE_PREFIX}/{docId}`;

    router.delete(
      {
        path,
        validate: jobHandlers.validate,
        options: { access: 'internal' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        return jobHandlers.handleDeleteReport({ path, user, context, req, res });
      })
    );
  };

  registerInternalGetList();
  registerInternalGetCount();
  registerInternalGetInfo();
  registerInternalDownloadReport();
  registerInternalDeleteReport();
}
