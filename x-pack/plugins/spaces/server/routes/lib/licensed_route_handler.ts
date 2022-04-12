/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, RequestHandler } from 'src/core/server';

import type { LicensingApiRequestHandlerContext } from '../../../../licensing/server';

export const createLicensedRouteHandler = <
  P,
  Q,
  B,
  Context extends CustomRequestHandlerContext<{ licensing: LicensingApiRequestHandlerContext }>
>(
  handler: RequestHandler<P, Q, B, Context>
) => {
  const licensedRouteHandler: RequestHandler<P, Q, B, Context> = async (
    context,
    request,
    responseToolkit
  ) => {
    const { license } = await context.licensing;
    const licenseCheck = license.check('spaces', 'basic');
    if (licenseCheck.state === 'unavailable' || licenseCheck.state === 'invalid') {
      return responseToolkit.forbidden({ body: { message: licenseCheck.message! } });
    }

    return handler(context, request, responseToolkit);
  };

  return licensedRouteHandler;
};
