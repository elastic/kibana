/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '../../../../../../src/core/server/http/router/router';
import type { ILicenseState } from '../../lib/license_state';
import type { ActionsRequestHandlerContext } from '../../types';
import { createActionRoute } from './create';
import { deleteActionRoute } from './delete';
import { executeActionRoute } from './execute';
import { getActionRoute } from './get';
import { getAllActionRoute } from './get_all';
import { listActionTypesRoute } from './list_action_types';
import { updateActionRoute } from './update';

export function defineLegacyRoutes(
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) {
  createActionRoute(router, licenseState);
  deleteActionRoute(router, licenseState);
  getActionRoute(router, licenseState);
  getAllActionRoute(router, licenseState);
  updateActionRoute(router, licenseState);
  listActionTypesRoute(router, licenseState);
  executeActionRoute(router, licenseState);
}
