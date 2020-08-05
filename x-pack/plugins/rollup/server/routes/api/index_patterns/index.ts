/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../../../types';
import { registerFieldsForWildcardRoute } from './register_fields_for_wildcard_route';

export function registerIndexPatternsRoutes(dependencies: RouteDependencies) {
  registerFieldsForWildcardRoute(dependencies);
}
