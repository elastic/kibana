/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';

import { registerGetAllRoute } from './register_get_route';

export function registerInferenceModelRoutes(dependencies: RouteDependencies) {
  registerGetAllRoute(dependencies);
}
