/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDeleteTrustedAppsRequestSchema,
  getGetOneTrustedAppRequestSchema,
  getGetTrustedAppsRequestSchema,
  getPostTrustedAppCreateRequestSchema,
  getPutTrustedAppUpdateRequestSchema,
} from '../../../../common/endpoint/schema/trusted_apps';
import {
  TRUSTED_APPS_CREATE_API,
  TRUSTED_APPS_DELETE_API,
  TRUSTED_APPS_GET_API,
  TRUSTED_APPS_LIST_API,
  TRUSTED_APPS_UPDATE_API,
  TRUSTED_APPS_SUMMARY_API,
} from '../../../../common/endpoint/constants';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';

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

export const registerTrustedAppsRoutes = async (
  router: SecuritySolutionPluginRouter,
  endpointAppContext: EndpointAppContext
) => {
  const config = await endpointAppContext.config();
  const experimentalValues = parseExperimentalConfigValue(config.enableExperimental);
  // DELETE one
  router.delete(
    {
      path: TRUSTED_APPS_DELETE_API,
      validate: getDeleteTrustedAppsRequestSchema(experimentalValues),
      options: { authRequired: true },
    },
    getTrustedAppsDeleteRouteHandler(endpointAppContext)
  );

  // GET one
  router.get(
    {
      path: TRUSTED_APPS_GET_API,
      validate: getGetOneTrustedAppRequestSchema(experimentalValues),
      options: { authRequired: true },
    },
    getTrustedAppsGetOneHandler(endpointAppContext)
  );

  // GET list
  router.get(
    {
      path: TRUSTED_APPS_LIST_API,
      validate: getGetTrustedAppsRequestSchema(experimentalValues),
      options: { authRequired: true },
    },
    getTrustedAppsListRouteHandler(endpointAppContext)
  );

  // CREATE
  router.post(
    {
      path: TRUSTED_APPS_CREATE_API,
      validate: getPostTrustedAppCreateRequestSchema(experimentalValues),
      options: { authRequired: true },
    },
    getTrustedAppsCreateRouteHandler(endpointAppContext)
  );

  // PUT
  router.put(
    {
      path: TRUSTED_APPS_UPDATE_API,
      validate: getPutTrustedAppUpdateRequestSchema(experimentalValues),
      options: { authRequired: true },
    },
    getTrustedAppsUpdateRouteHandler(endpointAppContext)
  );

  // SUMMARY
  router.get(
    {
      path: TRUSTED_APPS_SUMMARY_API,
      validate: false,
      options: { authRequired: true },
    },
    getTrustedAppsSummaryRouteHandler(endpointAppContext)
  );
};
