/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaResponseFactory, RequestHandler, RouteMethod } from 'kibana/server';

export const createLicensedRouteHandler = <
  P,
  Q,
  B,
  M extends RouteMethod,
  R extends KibanaResponseFactory
>(
  handler: RequestHandler<P, Q, B, M, R>
) => {
  const licensedRouteHandler: RequestHandler<P, Q, B, M, R> = (
    context,
    request,
    responseToolkit
  ) => {
    const { license } = context.licensing;
    const licenseCheck = license.check('security', 'basic');
    if (licenseCheck.state === 'unavailable' || licenseCheck.state === 'invalid') {
      return responseToolkit.forbidden({ body: { message: licenseCheck.message! } });
    }

    return handler(context, request, responseToolkit);
  };

  return licensedRouteHandler;
};
