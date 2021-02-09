/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, RequestHandler } from 'kibana/server';
import type { RouteDependencies, WatcherRequestHandlerContext } from '../../types';

export const licensePreRoutingFactory = <P, Q, B, Context extends WatcherRequestHandlerContext>(
  { getLicenseStatus }: RouteDependencies,
  handler: RequestHandler<P, Q, B, Context>
) => {
  return function licenseCheck(
    ctx: Context,
    request: KibanaRequest<P, Q, B>,
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
