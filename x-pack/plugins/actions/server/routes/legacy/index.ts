/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { ILicenseState } from '../../lib';
import { ActionsRequestHandlerContext } from '../../types';
import { createActionRoute } from './create';
import { deleteActionRoute } from './delete';
import { getAllActionRoute } from './get_all';
import { getActionRoute } from './get';
import { updateActionRoute } from './update';
import { listActionTypesRoute } from './list_action_types';
import { executeActionRoute } from './execute';

export function defineLegacyRoutes(
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) {
  createActionRoute(router, licenseState, usageCounter);
  deleteActionRoute(router, licenseState, usageCounter);
  getActionRoute(router, licenseState, usageCounter);
  getAllActionRoute(router, licenseState, usageCounter);
  updateActionRoute(router, licenseState, usageCounter);
  listActionTypesRoute(router, licenseState, usageCounter);
  executeActionRoute(router, licenseState, usageCounter);
}
