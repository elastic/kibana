/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { ObjectType } from '@kbn/config-schema';
import { LICENSE_STATUS } from '../../../../licensing/server/constants';

export const createLicensedRouteHandler = <
  P extends ObjectType<any>,
  Q extends ObjectType<any>,
  B extends ObjectType<any>
>(
  handler: RequestHandler<P, Q, B>
) => {
  const licensedRouteHandler: RequestHandler<P, Q, B> = (context, request, responseToolkit) => {
    const { license } = context.licensing;
    const licenseCheck = license.check('spaces', 'basic');
    if (
      licenseCheck.check === LICENSE_STATUS.Unavailable ||
      licenseCheck.check === LICENSE_STATUS.Invalid
    ) {
      return responseToolkit.forbidden({ body: { message: licenseCheck.message! } });
    }

    return handler(context, request, responseToolkit);
  };

  return licensedRouteHandler;
};
