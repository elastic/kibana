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

export const licensePreRoutingFactory = <P, Q, B>(
  { getLicenseStatus }: RouteDependencies,
  handler: RequestHandler<P, Q, B>
) => {
  return function licenseCheck(
    ctx: RequestHandlerContext,
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
