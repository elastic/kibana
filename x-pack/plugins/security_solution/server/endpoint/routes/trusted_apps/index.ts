/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import {
  DeleteTrustedAppsRequestSchema,
  GetTrustedAppsRequestSchema,
  PostTrustedAppCreateRequestSchema,
} from '../../../../common/endpoint/schema/trusted_apps';
import {
  TRUSTED_APPS_CREATE_API,
  TRUSTED_APPS_DELETE_API,
  TRUSTED_APPS_LIST_API,
} from '../../../../common/endpoint/constants';
import {
  getTrustedAppsCreateRouteHandler,
  getTrustedAppsDeleteRouteHandler,
  getTrustedAppsListRouteHandler,
} from './handlers';
import { EndpointAppContext } from '../../types';

export const registerTrustedAppsRoutes = (
  router: IRouter,
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
};
