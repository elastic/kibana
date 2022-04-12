/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler, KibanaRequest, RouteMethod, KibanaResponseFactory } from 'src/core/server';

import { ILicense } from '../common/types';
import type { LicensingRequestHandlerContext } from './types';

export type CheckLicense = (
  license: ILicense
) => { valid: false; message: string } | { valid: true; message: null };

export function wrapRouteWithLicenseCheck<P, Q, B, Context extends LicensingRequestHandlerContext>(
  checkLicense: CheckLicense,
  handler: RequestHandler<P, Q, B, Context>
): RequestHandler<P, Q, B, Context> {
  return async (
    context: Context,
    request: KibanaRequest<P, Q, B, RouteMethod>,
    response: KibanaResponseFactory
  ) => {
    const { license } = await context.licensing;
    const licenseCheckResult = checkLicense(license);

    if (licenseCheckResult.valid) {
      return handler(context, request, response);
    } else {
      return response.forbidden({
        body: licenseCheckResult.message,
      });
    }
  };
}
