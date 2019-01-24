/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerBootstrapRoute } from './register_bootstrap_route';
import { registerGetAffectedRoute } from './register_get_affected_route';
import { registerRetryRoute } from './register_retry_route';
import { registerRemoveRoute } from './register_remove_route';
import { registerAddPolicyRoute } from './register_add_policy_route';

export function registerIndexRoutes(server) {
  registerBootstrapRoute(server);
  registerGetAffectedRoute(server);
  registerRetryRoute(server);
  registerRemoveRoute(server);
  registerAddPolicyRoute(server);
}
