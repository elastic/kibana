/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  RequestHandler,
  RequestHandlerContext,
  KibanaResponseFactory,
  KibanaRequest,
} from 'kibana/server';
import { LicenseState, verifyApiAccessFactory } from './lib/license_state';

export function extendRouteWithLicenseCheck(
  licenseState: LicenseState,
  handler: RequestHandler<any, any, any, any>
): RequestHandler<any, any, any, any> {
  return async function(
    context: RequestHandlerContext,
    req: KibanaRequest<any, any, any, any>,
    res: KibanaResponseFactory
  ) {
    verifyApiAccessFactory(licenseState);
    return handler(context, req, res);
  };
}
