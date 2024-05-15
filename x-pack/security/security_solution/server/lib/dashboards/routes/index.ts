/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { SetupPlugins } from '../../../plugin_contract';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { getDashboardsByTagsRoute } from './get_dashboards_by_tags';

export const registerDashboardsRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security']
) => {
  getDashboardsByTagsRoute(router, logger, security);
};
