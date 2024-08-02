/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnPostAuthResultType } from '@kbn/core/server';
import type {
  AuthzDisabled,
  AuthzEnabled,
  HttpServiceSetup,
  Logger,
  RouteAuthz,
} from '@kbn/core/server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';

const isAuthzDisabled = (authz?: RouteAuthz): authz is AuthzDisabled => {
  return (authz as AuthzDisabled)?.enabled === false;
};

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

    // @ts-ignore
    if (isAuthzDisabled(request.route.options.security?.authz)) {
      logger.warn(
        `Route authz is disabled for ${request.url.pathname}${request.url.search}": ${request.route.options.security.authz.reason}`
      );

      return toolkit.next();
    }

    const authz = request.route.options.security?.authz as AuthzEnabled;

    /**
     * Please note, that this code was intended for POC demo purposes only and is not production-ready.
     */
    if (authz) {
      const requiredPrivileges = authz.requiredPrivileges.flatMap((privilegeEntry) => {
        if (typeof privilegeEntry === 'string') {
          return privilegeEntry;
        }

        if (
          typeof privilegeEntry === 'object' &&
          (!privilegeEntry.offering || privilegeEntry.offering === buildFlavor)
        ) {
          return [...(privilegeEntry.allRequired ?? []), ...(privilegeEntry.anyRequired ?? [])];
        }

        return [];
      });
      const apiActions = requiredPrivileges.map((permission) => actions.api.get(permission));

      const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
      const checkPrivilegesResponse = await checkPrivileges({ kibana: apiActions });
      const kibanaPrivileges: Record<string, boolean> = {};

      for (const kbPrivilege of checkPrivilegesResponse.privileges.kibana) {
        kibanaPrivileges[kbPrivilege.privilege.replace('api:', '')] = kbPrivilege.authorized;
      }

      for (const requiredPrivilege of authz.requiredPrivileges) {
        if (typeof requiredPrivilege === 'string' && !kibanaPrivileges[requiredPrivilege]) {
          const missingPrivileges = Object.keys(kibanaPrivileges).filter(
            (key) => !kibanaPrivileges[key]
          );
          logger.warn(
            `User not authorized for "${request.url.pathname}${
              request.url.search
            }", responding with 403: missing privileges: ${missingPrivileges.join(', ')}`
          );

          return response.forbidden();
        }

        if (
          typeof requiredPrivilege === 'object' &&
          (!requiredPrivilege.offering || requiredPrivilege.offering === buildFlavor)
        ) {
          const allRequired = requiredPrivilege.allRequired ?? [];
          const anyRequired = requiredPrivilege.anyRequired ?? [];

          if (
            !allRequired.every((privilege) => kibanaPrivileges[privilege]) &&
            !anyRequired.some((privilege) => kibanaPrivileges[privilege])
          ) {
            const missingPrivileges = Object.keys(kibanaPrivileges).filter(
              (key) => !kibanaPrivileges[key]
            );
            logger.warn(
              `User not authorized for "${request.url.pathname}${
                request.url.search
              }", responding with 403: missing privileges: ${missingPrivileges.join(', ')}`
            );

            return response.forbidden();
          }
        }
      }

      return { type: OnPostAuthResultType.next, authzResult: kibanaPrivileges };
    }

    const tags = request.route.options.tags;
    const tagPrefix = 'access:';
    const actionTags = tags.filter((tag) => tag.startsWith(tagPrefix));

    // if there are no tags starting with "access:", just continue
    if (actionTags.length === 0) {
      return toolkit.next();
    }

    const apiActions = actionTags.map((tag) => actions.api.get(tag.substring(tagPrefix.length)));

    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
    const checkPrivilegesResponse = await checkPrivileges({ kibana: apiActions });

    // we've actually authorized the request
    if (checkPrivilegesResponse.hasAllRequested) {
      logger.debug(`User authorized for "${request.url.pathname}${request.url.search}"`);
      return toolkit.next();
    }

    logger.warn(
      `User not authorized for "${request.url.pathname}${request.url.search}": responding with 403`
    );
    return response.forbidden();
  });
}
