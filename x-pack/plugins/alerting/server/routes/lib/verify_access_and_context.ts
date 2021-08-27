/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RequestHandler } from '../../../../../../src/core/server/http/router/router';
import { isErrorThatHandlesItsOwnResponse } from '../../lib/errors';
import { verifyApiAccess } from '../../lib/license_api_access';
import type { ILicenseState } from '../../lib/license_state';
import type { AlertingRequestHandlerContext } from '../../types';

type AlertingRequestHandlerWrapper = <P, Q, B>(
  licenseState: ILicenseState,
  handler: RequestHandler<P, Q, B, AlertingRequestHandlerContext>
) => RequestHandler<P, Q, B, AlertingRequestHandlerContext>;

export const verifyAccessAndContext: AlertingRequestHandlerWrapper = (licenseState, handler) => {
  return async (context, request, response) => {
    verifyApiAccess(licenseState);

    if (!context.alerting) {
      return response.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
    }

    try {
      return await handler(context, request, response);
    } catch (e) {
      if (isErrorThatHandlesItsOwnResponse(e)) {
        return e.sendResponse(response);
      }
      throw e;
    }
  };
};
