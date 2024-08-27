/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CustomRequestHandlerContext, RequestHandler } from '@kbn/core/server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';

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
    try {
      const { license } = await context.licensing;
      const licenseCheck = license.check('spaces', 'basic');
      if (licenseCheck.state === 'unavailable' || licenseCheck.state === 'invalid') {
        return responseToolkit.forbidden({ body: { message: licenseCheck.message! } });
      }

      return await handler(context, request, responseToolkit);
    } catch (e) {
      throw e;
    }
  };

  return licensedRouteHandler;
};
