/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { createActionRoute } from './create_action_route';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getActionDetailsRoute } from './get_action_details_route';
import { getActionResultsRoute } from './get_action_results_route';
import { getActionStatusRoute } from './get_action_status_route';

export const initActionRoutes = (router: IRouter, context: OsqueryAppContext) => {
  createActionRoute(router, context);
  getActionDetailsRoute(router, context);
  getActionResultsRoute(router, context);
  getActionStatusRoute(router, context);
};
