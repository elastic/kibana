/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { getAllConnectorsRoute } from './connector/get_all';
import { getAllConnectorsIncludingSystemRoute } from './connector/get_all_system';
import { listTypesRoute } from './connector/list_types';
import { listTypesWithSystemRoute } from './connector/list_types_system';
import { ILicenseState } from '../lib';
import { ActionsRequestHandlerContext } from '../types';
import { createActionRoute } from './create';
import { deleteActionRoute } from './delete';
import { executeActionRoute } from './execute';
import { getConnectorRoute } from './connector/get';
import { updateActionRoute } from './update';
import { getOAuthAccessToken } from './get_oauth_access_token';
import { defineLegacyRoutes } from './legacy';
import { ActionsConfigurationUtilities } from '../actions_config';
import { getGlobalExecutionLogRoute } from './get_global_execution_logs';
import { getGlobalExecutionKPIRoute } from './get_global_execution_kpi';

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
  getConnectorRoute(router, licenseState);
  getAllConnectorsRoute(router, licenseState);
  updateActionRoute(router, licenseState);
  listTypesRoute(router, licenseState);
  executeActionRoute(router, licenseState);
  getGlobalExecutionLogRoute(router, licenseState);
  getGlobalExecutionKPIRoute(router, licenseState);

  getOAuthAccessToken(router, licenseState, actionsConfigUtils);
  getAllConnectorsIncludingSystemRoute(router, licenseState);
  listTypesWithSystemRoute(router, licenseState);
}
