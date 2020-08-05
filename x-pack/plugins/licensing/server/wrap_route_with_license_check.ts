/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RequestHandler,
  RequestHandlerContext,
  KibanaRequest,
  RouteMethod,
  KibanaResponseFactory,
} from 'src/core/server';

import { ILicense } from '../common/types';

export type CheckLicense = (
  license: ILicense
) => { valid: false; message: string } | { valid: true; message: null };

export function wrapRouteWithLicenseCheck<P, Q, B>(
  checkLicense: CheckLicense,
  handler: RequestHandler<P, Q, B>
): RequestHandler<P, Q, B> {
  return async (
    context: RequestHandlerContext,
    request: KibanaRequest<P, Q, B, RouteMethod>,
    response: KibanaResponseFactory
  ) => {
    const licenseCheckResult = checkLicense(context.licensing.license);

    if (licenseCheckResult.valid) {
      return handler(context, request, response);
    } else {
      return response.forbidden({
        body: licenseCheckResult.message,
      });
    }
  };
}
