/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, KibanaResponseFactory, RequestHandler, RouteMethod } from 'src/core/server';
import { difference } from 'lodash';
import type { BeatsManagementRequestHandlerContext } from '../lib/types';

export function wrapRouteWithSecurity<
  P,
  Q,
  B,
  Context extends BeatsManagementRequestHandlerContext
>(
  {
    requiredLicense = [],
    requiredRoles = [],
  }: { requiredLicense?: string[]; requiredRoles?: string[] },
  handler: RequestHandler<P, Q, B, Context>
): RequestHandler<P, Q, B, Context> {
  return async (
    context: Context,
    request: KibanaRequest<P, Q, B, RouteMethod>,
    response: KibanaResponseFactory
  ) => {
    const beatsManagement = context.beatsManagement!;
    const license = beatsManagement.framework.license;
    const user = beatsManagement.framework.getUser(request);

    if (
      requiredLicense.length > 0 &&
      (license.expired || !requiredLicense.includes(license.type))
    ) {
      return response.forbidden({
        body: {
          message: `Your ${license.type} license does not support this API or is expired. Please upgrade your license.`,
        },
      });
    }

    if (requiredRoles.length > 0) {
      if (user.kind !== 'authenticated') {
        return response.forbidden({
          body: {
            message: `Request must be authenticated`,
          },
        });
      }

      if (
        user.kind === 'authenticated' &&
        !user.roles.includes('superuser') &&
        difference(requiredRoles, user.roles).length !== 0
      ) {
        return response.forbidden({
          body: {
            message: `Request must be authenticated by a user with one of the following user roles: ${requiredRoles.join(
              ','
            )}`,
          },
        });
      }
    }

    return handler(context, request, response);
  };
}
