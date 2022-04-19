/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from '@kbn/core/server';
import { RouteDependencies } from '../../types';

export const licensePreRoutingFactory = (
  { getLicenseStatus }: RouteDependencies,
  handler: RequestHandler<any, any, any>
) => {
  return function licenseCheck(
    ctx: RequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ) {
    const licenseStatus = getLicenseStatus();
    if (!licenseStatus.valid) {
      return response.forbidden({
        body: {
          message: licenseStatus.message || '',
        },
      });
    }

    return handler(ctx, request, response);
  };
};
