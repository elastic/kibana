/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMServerLibs } from '../lib/lib';
import { UMRestApiRouteCreator, UMServerRoute } from './types';

export const createRouteWithAuth = (
  libs: UMServerLibs,
  routeCreator: UMRestApiRouteCreator
): UMServerRoute => {
  const restRoute = routeCreator(libs);
  const { handler, method, path, options } = restRoute;
  const authHandler = (request: any, h: any) => {
    try {
      if (libs.auth.requestIsValid(request)) {
        return handler(request, h);
      }
    } catch (err) {
      throw err;
    }
  };
  return {
    method,
    path,
    options,
    handler: authHandler,
  };
};
