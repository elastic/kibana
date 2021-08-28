/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '../../../../src/core/server/http/router/request';
import type { KibanaResponseFactory } from '../../../../src/core/server/http/router/response';
import type { RouteMethod } from '../../../../src/core/server/http/router/route';
import type { RequestHandler } from '../../../../src/core/server/http/router/router';
import type { ILicense } from '../common/types';
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
