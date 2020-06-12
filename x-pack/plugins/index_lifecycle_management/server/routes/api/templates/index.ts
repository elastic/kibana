/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../../../types';
import { registerFetchRoute } from './register_fetch_route';
import { registerAddPolicyRoute } from './register_add_policy_route';

export function registerTemplatesRoutes(dependencies: RouteDependencies) {
  registerFetchRoute(dependencies);
  registerAddPolicyRoute(dependencies);
}
