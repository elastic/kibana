/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';
import { registerLoadIndexPatternFieldsRoute } from './load_index_pattern_fields';

export function registerIndicesRoutes(dependencies: RouteDependencies) {
  registerLoadIndexPatternFieldsRoute(dependencies);
}
