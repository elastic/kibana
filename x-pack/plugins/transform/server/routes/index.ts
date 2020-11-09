/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../types';

import { registerFieldHistogramsRoutes } from './api/field_histograms';
import { registerPrivilegesRoute } from './api/privileges';
import { registerTransformsRoutes } from './api/transforms';

import { API_BASE_PATH } from '../../common/constants';

export const addBasePath = (uri: string): string => `${API_BASE_PATH}${uri}`;

export class ApiRoutes {
  setup(dependencies: RouteDependencies) {
    registerFieldHistogramsRoutes(dependencies);
    registerPrivilegesRoute(dependencies);
    registerTransformsRoutes(dependencies);
  }

  start() {}
  stop() {}
}
