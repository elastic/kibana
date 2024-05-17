/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createStatusRoute } from './create_status_route';

export const initStatusRoutes = (router: IRouter, context: OsqueryAppContext) => {
  createStatusRoute(router, context);
};
