/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { RequestHandler, RequestHandlerContext } from 'kibana/server';
import type { LicensingApiRequestHandlerContext } from '../../../../licensing/server';

export const createLicensedRouteHandler = <
  P,
  Q,
  B,
  Context extends RequestHandlerContext & { licensing: LicensingApiRequestHandlerContext }
>(
  handler: RequestHandler<P, Q, B, Context>
) => {
  const licensedRouteHandler: RequestHandler<P, Q, B, Context> = (
    context,
    request,
    responseToolkit
  ) => {
    const { license } = context.licensing;
    const licenseCheck = license.check('spaces', 'basic');
    if (licenseCheck.state === 'unavailable' || licenseCheck.state === 'invalid') {
      return responseToolkit.forbidden({ body: { message: licenseCheck.message! } });
    }

    return handler(context, request, responseToolkit);
  };

  return licensedRouteHandler;
};
