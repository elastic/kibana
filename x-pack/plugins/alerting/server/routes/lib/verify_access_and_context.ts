/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { ILicenseState, isErrorThatHandlesItsOwnResponse, verifyApiAccess } from '../../lib';
import { AlertingRequestHandlerContext } from '../../types';
import { i18n } from '@kbn/i18n';

type AlertingRequestHandlerWrapper = <P, Q, B>(
  licenseState: ILicenseState,
  handler: RequestHandler<P, Q, B, AlertingRequestHandlerContext>
) => RequestHandler<P, Q, B, AlertingRequestHandlerContext>;

export const verifyAccessAndContext: AlertingRequestHandlerWrapper = (licenseState, handler) => {
  return async (context, request, response) => {
    verifyApiAccess(licenseState);

    if (!context.alerting) {
      return response.badRequest({ body: i18n.translate('xpack.alerting.routes.routerHandlerNotRegistered',
        { defaultMessage:'RouteHandlerContext is not registered for alerting' })
      });
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
