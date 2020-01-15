/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'kibana/server';
import { RouteDependencies } from '../../types';

export const licensePreRoutingFactory = (
  { getLicenseStatus }: RouteDependencies,
  handler: RequestHandler
) => {
  return function licenseCheck(
    ctx: RequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ) {
    const licenseStatus = getLicenseStatus();
    if (!licenseStatus.hasRequired) {
      return response.customError({
        body: {
          message: licenseStatus.message || '',
        },
        statusCode: 403,
      });
    }

    return handler(ctx, request, response);
  };
};
