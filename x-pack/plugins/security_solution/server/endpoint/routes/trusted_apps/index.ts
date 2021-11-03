/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DeleteTrustedAppsRequestSchema,
  GetOneTrustedAppRequestSchema,
  GetTrustedAppsRequestSchema,
  PostTrustedAppCreateRequestSchema,
  PutTrustedAppUpdateRequestSchema,
  GetTrustedAppsSummaryRequestSchema,
} from '../../../../common/endpoint/schema/trusted_apps';
import {
  TRUSTED_APPS_CREATE_API,
  TRUSTED_APPS_DELETE_API,
  TRUSTED_APPS_GET_API,
  TRUSTED_APPS_LIST_API,
  TRUSTED_APPS_UPDATE_API,
  TRUSTED_APPS_SUMMARY_API,
} from '../../../../common/endpoint/constants';

import {
  getTrustedAppsCreateRouteHandler,
  getTrustedAppsDeleteRouteHandler,
  getTrustedAppsGetOneHandler,
  getTrustedAppsListRouteHandler,
  getTrustedAppsSummaryRouteHandler,
  getTrustedAppsUpdateRouteHandler,
} from './handlers';
import { SecuritySolutionPluginRouter } from '../../../types';
import { EndpointAppContext } from '../../types';

export const registerTrustedAppsRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointAppContext: EndpointAppContext
) => {
  // DELETE one
  router.delete(
    {
      path: TRUSTED_APPS_DELETE_API,
      validate: DeleteTrustedAppsRequestSchema,
      options: { authRequired: true },
    },
    getTrustedAppsDeleteRouteHandler(endpointAppContext)
  );

  // GET one
  router.get(
    {
      path: TRUSTED_APPS_GET_API,
      validate: GetOneTrustedAppRequestSchema,
      options: { authRequired: true },
    },
    getTrustedAppsGetOneHandler(endpointAppContext)
  );

  // GET list
  router.get(
    {
      path: TRUSTED_APPS_LIST_API,
      validate: GetTrustedAppsRequestSchema,
      options: { authRequired: true },
    },
    getTrustedAppsListRouteHandler(endpointAppContext)
  );

  // CREATE
  router.post(
    {
      path: TRUSTED_APPS_CREATE_API,
      validate: PostTrustedAppCreateRequestSchema,
      options: { authRequired: true },
    },
    getTrustedAppsCreateRouteHandler(endpointAppContext)
  );

  // PUT
  router.put(
    {
      path: TRUSTED_APPS_UPDATE_API,
      validate: PutTrustedAppUpdateRequestSchema,
      options: { authRequired: true },
    },
    getTrustedAppsUpdateRouteHandler(endpointAppContext)
  );

  // SUMMARY
  router.get(
    {
      path: TRUSTED_APPS_SUMMARY_API,
      validate: GetTrustedAppsSummaryRequestSchema,
      options: { authRequired: true },
    },
    getTrustedAppsSummaryRouteHandler(endpointAppContext)
  );
};
