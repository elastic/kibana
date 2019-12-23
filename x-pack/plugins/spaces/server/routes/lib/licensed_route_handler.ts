/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import { LICENSE_CHECK_STATE } from '../../../../licensing/server';

export const createLicensedRouteHandler = <P, Q, B>(handler: RequestHandler<P, Q, B>) => {
  const licensedRouteHandler: RequestHandler<P, Q, B> = (context, request, responseToolkit) => {
    const { license } = context.licensing;
    const licenseCheck = license.check('spaces', 'basic');
    if (
      licenseCheck.state === LICENSE_CHECK_STATE.Unavailable ||
      licenseCheck.state === LICENSE_CHECK_STATE.Invalid
    ) {
      return responseToolkit.forbidden({ body: { message: licenseCheck.message! } });
    }

    return handler(context, request, responseToolkit);
  };

  return licensedRouteHandler;
};
