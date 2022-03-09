/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../plugin';

import { registerApiKeysRoutes } from './api_keys';
import { registerGroupsRoutes } from './groups';
import { registerOAuthRoutes } from './oauth';
import { registerOverviewRoute } from './overview';
import { registerRoleMappingsRoutes } from './role_mappings';
import { registerSecurityRoutes } from './security';
import { registerSettingsRoutes } from './settings';
import { registerSourcesRoutes } from './sources';

export const registerWorkplaceSearchRoutes = (dependencies: RouteDependencies) => {
  registerApiKeysRoutes(dependencies);
  registerOverviewRoute(dependencies);
  registerOAuthRoutes(dependencies);
  registerGroupsRoutes(dependencies);
  registerRoleMappingsRoutes(dependencies);
  registerSourcesRoutes(dependencies);
  registerSettingsRoutes(dependencies);
  registerSecurityRoutes(dependencies);
};
