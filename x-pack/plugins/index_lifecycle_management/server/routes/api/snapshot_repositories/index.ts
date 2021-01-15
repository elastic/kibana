/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerFetchRoute } from './register_fetch_route';
import { RouteDependencies } from '../../../types';

export const registerSnapshotRepositoriesRoutes = (deps: RouteDependencies) => {
  registerFetchRoute(deps);
};
