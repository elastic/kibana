/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerBootstrapRoute } from './register_bootstrap_route';
import { registerGetAffectedRoute } from './register_get_affected_route';

export function registerIndicesRoutes(server) {
  registerBootstrapRoute(server);
  registerGetAffectedRoute(server);
}
