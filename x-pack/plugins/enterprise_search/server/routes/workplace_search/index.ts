/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouteDependencies } from '../../plugin';

import { registerOverviewRoute } from './overview';
import {
  registerGroupsRoute,
  registerSearchGroupsRoute,
  registerGroupRoute,
  registerGroupUsersRoute,
  registerShareGroupRoute,
  registerAssignGroupRoute,
  registerBoostsGroupRoute,
} from './groups';

export const registerWorkplaceSearchRoutes = (dependencies: IRouteDependencies) => {
  registerOverviewRoute(dependencies);
  registerGroupsRoute(dependencies);
  registerSearchGroupsRoute(dependencies);
  registerGroupRoute(dependencies);
  registerGroupUsersRoute(dependencies);
  registerShareGroupRoute(dependencies);
  registerAssignGroupRoute(dependencies);
  registerBoostsGroupRoute(dependencies);
};
