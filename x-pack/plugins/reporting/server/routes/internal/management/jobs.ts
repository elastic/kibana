/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ReportingCore } from '../../..';
import { INTERNAL_ROUTES } from '../../../../common/constants';
import { authorizedUserPreRouting, getCounters } from '../../common';
import { handleUnavailable } from '../../common/generate';
import {
  getCommonJobManagementRoutes,
  jobManagementPreRouting,
  jobsQueryFactory,
} from '../../common/jobs';

export function registerJobInfoRoutesInternal(reporting: ReportingCore) {
  const commonRoutes = getCommonJobManagementRoutes(reporting);
  commonRoutes.registerDownloadReport(INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX + '/{docId}');
  commonRoutes.registerDeleteReport(INTERNAL_ROUTES.JOBS.DELETE_PREFIX + '/{docId}');

  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;
  const jobsQuery = jobsQueryFactory(reporting);

  // list jobs in the queue, paginated
  const registerGetList = (path: string) => {
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

  // return the count of all jobs in the queue
  const registerGetCount = (path: string) => {
    router.get(
      { path, validate: false },
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

  const registerGetInfo = (path: string) => {
    // return some info about the job

    router.get(
      {
        path,
        validate: {
          params: schema.object({
            docId: schema.string({ minLength: 2 }),
          }),
        },
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

  registerGetList(INTERNAL_ROUTES.JOBS.LIST);
  registerGetCount(INTERNAL_ROUTES.JOBS.COUNT);
  registerGetInfo(INTERNAL_ROUTES.JOBS.INFO_PREFIX + '/{docId}');
}
