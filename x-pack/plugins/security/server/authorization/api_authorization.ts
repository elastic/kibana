/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthzDisabled,
  AuthzEnabled,
  HttpServiceSetup,
  Logger,
  Privilege,
  PrivilegeSet,
  RouteAuthz,
} from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type { RecursiveReadonly } from '@kbn/utility-types';

import { API_OPERATION_PREFIX, SUPERUSER_PRIVILEGES } from '../../common/constants';

const isAuthzDisabled = (authz?: RecursiveReadonly<RouteAuthz>): authz is AuthzDisabled => {
  return (authz as AuthzDisabled)?.enabled === false;
};

const isReservedPrivilegeSet = (privilege: string): privilege is ReservedPrivilegesSet => {
  return Object.hasOwn(ReservedPrivilegesSet, privilege);
};

export function initAPIAuthorization(
  http: HttpServiceSetup,
  {
    actions,
    checkPrivilegesDynamicallyWithRequest,
    checkPrivilegesWithRequest,
    mode,
  }: AuthorizationServiceSetup,
  logger: Logger
) {
  http.registerOnPostAuth(async (request, response, toolkit) => {
    // if we aren't using RBAC for this request, just continue
    if (!mode.useRbacForRequest(request)) {
      return toolkit.next();
    }

    const security = request.route.options.security;

    if (security) {
      if (isAuthzDisabled(security.authz)) {
        logger.warn(
          `Route authz is disabled for ${request.url.pathname}${request.url.search}": ${security.authz.reason}`
        );

        return toolkit.next();
      }

      const authz = security.authz as AuthzEnabled;

      const { requestedPrivileges, requestedReservedPrivileges } = authz.requiredPrivileges.reduce(
        (acc, privilegeEntry) => {
          const privileges =
            typeof privilegeEntry === 'object'
              ? [...(privilegeEntry.allRequired ?? []), ...(privilegeEntry.anyRequired ?? [])]
              : [privilegeEntry];

          for (const privilege of privileges) {
            if (isReservedPrivilegeSet(privilege)) {
              acc.requestedReservedPrivileges.push(privilege);
            } else {
              acc.requestedPrivileges.push(privilege);
            }
          }

          return acc;
        },
        {
          requestedPrivileges: [] as string[],
          requestedReservedPrivileges: [] as string[],
        }
      );

      const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
      const privilegeToApiOperation = (privilege: string) =>
        privilege.replace(API_OPERATION_PREFIX, '');

      const kibanaPrivileges: Record<string, boolean> = {};

      if (requestedPrivileges.length > 0) {
        const checkPrivilegesResponse = await checkPrivileges({
          kibana: requestedPrivileges.map((permission) => actions.api.get(permission)),
        });

        for (const kbPrivilege of checkPrivilegesResponse.privileges.kibana) {
          kibanaPrivileges[privilegeToApiOperation(kbPrivilege.privilege)] = kbPrivilege.authorized;
        }
      }

      for (const reservedPrivilege of requestedReservedPrivileges) {
        if (reservedPrivilege === ReservedPrivilegesSet.superuser) {
          const checkSuperuserPrivilegesResponse = await checkPrivilegesWithRequest(
            request
          ).globally(SUPERUSER_PRIVILEGES);

          kibanaPrivileges[ReservedPrivilegesSet.superuser] =
            checkSuperuserPrivilegesResponse.hasAllRequested;
        }
      }

      const hasRequestedPrivilege = (kbPrivilege: Privilege | PrivilegeSet) => {
        if (typeof kbPrivilege === 'object') {
          const allRequired = kbPrivilege.allRequired ?? [];
          const anyRequired = kbPrivilege.anyRequired ?? [];

          return (
            allRequired.every((privilege: string) => kibanaPrivileges[privilege]) &&
            (!anyRequired.length ||
              anyRequired.some((privilege: string) => kibanaPrivileges[privilege]))
          );
        }

        return kibanaPrivileges[kbPrivilege];
      };

      for (const requiredPrivilege of authz.requiredPrivileges) {
        if (!hasRequestedPrivilege(requiredPrivilege)) {
          const missingPrivileges = Object.keys(kibanaPrivileges).filter(
            (key) => !kibanaPrivileges[key]
          );
          const forbiddenMessage = `API [${request.route.method.toUpperCase()} ${
            request.url.pathname
          }${
            request.url.search
          }] is unauthorized for user, this action is granted by the Kibana privileges [${missingPrivileges}]`;

          logger.warn(forbiddenMessage);

          return response.forbidden({
            body: {
              message: forbiddenMessage,
            },
          });
        }
      }

      return toolkit.authzResultNext(kibanaPrivileges);
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
