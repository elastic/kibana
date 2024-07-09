/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceSetup, Logger } from '@kbn/core/server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import { deepFreeze } from '@kbn/std';

export function initAPIAuthorization(
  http: HttpServiceSetup,
  { actions, checkPrivilegesDynamicallyWithRequest, mode }: AuthorizationServiceSetup,
  buildFlavor: string,
  logger: Logger
) {
  http.registerOnPostAuth(async (request, response, toolkit) => {
    // if we aren't using RBAC for this request, just continue
    if (!mode.useRbacForRequest(request)) {
      return toolkit.next();
    }

    const authz = request.route.options.authz;

    const checkAuthz = async (apiActions: string[]) => {
      const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
      const checkPrivilegesResponse = await checkPrivileges({ kibana: apiActions });

      if (authz && authz?.passThrough) {
        Object.defineProperty(request, 'authzResponse', {
          value: deepFreeze(checkPrivilegesResponse),
          enumerable: false,
          configurable: false,
          writable: false,
        });
      }

      // we've actually authorized the request
      if (checkPrivilegesResponse.hasAllRequested) {
        logger.debug(`User authorized for "${request.url.pathname}${request.url.search}"`);
        return toolkit.next();
      }

      logger.warn(
        `User not authorized for "${request.url.pathname}${request.url.search}": responding with 403`
      );
      return response.forbidden();
    };

    if (authz) {
      const requiredPrivileges = authz.requiredPrivileges.flatMap((privilegeEntry) => {
        if (typeof privilegeEntry === 'string') {
          return privilegeEntry;
        }

        if (typeof privilegeEntry === 'object' && privilegeEntry.tier === buildFlavor) {
          return privilegeEntry.privileges;
        }

        return [];
      });
      const apiActions = requiredPrivileges.map((permission) => actions.api.get(permission));

      return await checkAuthz(apiActions);
    }

    const tags = request.route.options.tags;
    const tagPrefix = 'access:';
    const actionTags = tags.filter((tag) => tag.startsWith(tagPrefix));

    // if there are no tags starting with "access:", just continue
    if (actionTags.length === 0) {
      return toolkit.next();
    }

    const apiActions = actionTags.map((tag) => actions.api.get(tag.substring(tagPrefix.length)));

    return await checkAuthz(apiActions);
  });
}
