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
} from 'src/core/server';
import { LicenseCheckResult } from '../types';

export const licensePreRoutingFactory = (
  getLicenseCheckResults: () => LicenseCheckResult,
  handler: RequestHandler<any, any, any>
): RequestHandler<any, any, any> => {
  // License checking and enable/disable logic
  return function licensePreRouting(
    ctx: RequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ) {
    const licenseCheckResults = getLicenseCheckResults();

    if (!licenseCheckResults.isAvailable) {
      return response.forbidden();
    }

    return handler(ctx, request, response);
  };
};
