/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../../src/core/server';
import { getAssetsStatusRoute } from './get_assets_status_route';
import { updateAssetsRoute } from './update_assets_route';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const initAssetRoutes = (router: IRouter, context: OsqueryAppContext) => {
  getAssetsStatusRoute(router, context);
  updateAssetsRoute(router, context);
};
