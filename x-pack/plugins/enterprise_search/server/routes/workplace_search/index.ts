/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../../plugin';

import { registerOverviewRoute } from './overview';
import { registerGroupsRoutes } from './groups';
import { registerSourcesRoutes } from './sources';
import { registerSettingsRoutes } from './settings';

export const registerWorkplaceSearchRoutes = (dependencies: RouteDependencies) => {
  registerOverviewRoute(dependencies);
  registerGroupsRoutes(dependencies);
  registerSourcesRoutes(dependencies);
  registerSettingsRoutes(dependencies);
};
