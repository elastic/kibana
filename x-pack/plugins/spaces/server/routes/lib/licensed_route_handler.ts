/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from 'kibana/server';

export const createLicensedRouteHandler = <P, Q, B>(handler: RequestHandler<P, Q, B>) => {
  const licensedRouteHandler: RequestHandler<P, Q, B> = (context, request, responseToolkit) => {
    const { license } = context.licensing;
    const licenseCheck = license.check('spaces', 'basic');
    if (licenseCheck.state === 'unavailable' || licenseCheck.state === 'invalid') {
      return responseToolkit.forbidden({ body: { message: licenseCheck.message! } });
    }

    return handler(context, request, responseToolkit);
  };

  return licensedRouteHandler;
};
