/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { ILicenseState } from '../lib';
import { ActionsRequestHandlerContext } from '../types';
import { createActionRoute } from './create';
import { deleteActionRoute } from './delete';
import { executeActionRoute } from './execute';
import { getActionRoute } from './get';
import { getAllActionRoute } from './get_all';
import { connectorTypesRoute } from './connector_types';
import { updateActionRoute } from './update';
import { defineLegacyRoutes } from './legacy';

export function defineRoutes(
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) {
  defineLegacyRoutes(router, licenseState);

  createActionRoute(router, licenseState);
  deleteActionRoute(router, licenseState);
  getActionRoute(router, licenseState);
  getAllActionRoute(router, licenseState);
  updateActionRoute(router, licenseState);
  connectorTypesRoute(router, licenseState);
  executeActionRoute(router, licenseState);
}
