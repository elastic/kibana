/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerAcknowledgeRoute } from './register_acknowledge_route';
import { RouteDependencies } from '../../../../types';

export function registerActionRoutes(deps: RouteDependencies) {
  registerAcknowledgeRoute(deps);
}
