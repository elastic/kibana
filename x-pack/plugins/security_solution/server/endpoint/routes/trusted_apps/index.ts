/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DeleteTrustedAppsRequestSchema,
  GetTrustedAppsRequestSchema,
  PostTrustedAppCreateRequestSchema,
} from '../../../../common/endpoint/schema/trusted_apps';
import {
  TRUSTED_APPS_CREATE_API,
  TRUSTED_APPS_DELETE_API,
  TRUSTED_APPS_LIST_API,
  TRUSTED_APPS_SUMMARY_API,
} from '../../../../common/endpoint/constants';
import {
  getTrustedAppsCreateRouteHandler,
  getTrustedAppsDeleteRouteHandler,
  getTrustedAppsListRouteHandler,
  getTrustedAppsSummaryRouteHandler,
} from './handlers';
import { SecuritySolutionPluginRouter } from '../../../types';

export const registerTrustedAppsRoutes = (router: SecuritySolutionPluginRouter) => {
  // DELETE one
  router.delete(
    {
      path: TRUSTED_APPS_DELETE_API,
      validate: DeleteTrustedAppsRequestSchema,
      options: { authRequired: true },
    },
    getTrustedAppsDeleteRouteHandler()
  );

  // GET list
  router.get(
    {
      path: TRUSTED_APPS_LIST_API,
      validate: GetTrustedAppsRequestSchema,
      options: { authRequired: true },
    },
    getTrustedAppsListRouteHandler()
  );

  // CREATE
  router.post(
    {
      path: TRUSTED_APPS_CREATE_API,
      validate: PostTrustedAppCreateRequestSchema,
      options: { authRequired: true },
    },
    getTrustedAppsCreateRouteHandler()
  );

  // SUMMARY
  router.get(
    {
      path: TRUSTED_APPS_SUMMARY_API,
      validate: false,
      options: { authRequired: true },
    },
    getTrustedAppsSummaryRouteHandler()
  );
};
