/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { ILicenseState } from '../lib';
import { ActionsRequestHandlerContext } from '../types';
import { createActionRoute } from './create';
import { deleteActionRoute } from './delete';
import { executeActionRoute } from './execute';
import { getActionRoute } from './get';
import { getAllActionRoute } from './get_all';
import { connectorTypesRoute } from './connector_types';
import { updateActionRoute } from './update';
import { getWellKnownEmailServiceRoute } from './get_well_known_email_service';
import { getOAuthAccessToken } from './get_oauth_access_token';
import { defineLegacyRoutes } from './legacy';
import { ActionsConfigurationUtilities } from '../actions_config';

export interface RouteOptions {
  router: IRouter<ActionsRequestHandlerContext>;
  licenseState: ILicenseState;
  actionsConfigUtils: ActionsConfigurationUtilities;
  usageCounter?: UsageCounter;
}

export function defineRoutes(opts: RouteOptions) {
  const { router, licenseState, actionsConfigUtils, usageCounter } = opts;

  defineLegacyRoutes(router, licenseState, usageCounter);

  createActionRoute(router, licenseState);
  deleteActionRoute(router, licenseState);
  getActionRoute(router, licenseState);
  getAllActionRoute(router, licenseState);
  updateActionRoute(router, licenseState);
  connectorTypesRoute(router, licenseState);
  executeActionRoute(router, licenseState);

  getOAuthAccessToken(router, licenseState, actionsConfigUtils);
  getWellKnownEmailServiceRoute(router, licenseState);
}
