/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_ROUTES } from '@kbn/reporting-common';
import { ROUTE_TAG_CAN_REDIRECT } from '@kbn/security-plugin/server';
import { ReportingCore } from '../..';
import { authorizedUserPreRouting } from '../common';
import { commonJobsRouteHandlerFactory } from '../common/jobs';

export function registerJobInfoRoutesPublic(reporting: ReportingCore) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  // use common route handlers that are shared for public and internal routes
  const jobHandlers = commonJobsRouteHandlerFactory(reporting, { isInternal: false });

  const registerPublicDownloadReport = () => {
    // trigger a download of the output from a job
    const path = PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX + '/{docId}';
    router.get(
      {
        path,
        validate: jobHandlers.validate,
        options: { tags: [ROUTE_TAG_CAN_REDIRECT], access: 'public' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        return jobHandlers.handleDownloadReport({ path, user, context, req, res });
      })
    );
  };

  const registerPublicDeleteReport = () => {
    // allow a report to be deleted
    const path = PUBLIC_ROUTES.JOBS.DELETE_PREFIX + '/{docId}';
    router.delete(
      {
        path,
        validate: jobHandlers.validate,
        options: { access: 'public' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        return jobHandlers.handleDeleteReport({ path, user, context, req, res });
      })
    );
  };

  registerPublicDownloadReport();
  registerPublicDeleteReport();
}
