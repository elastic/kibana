/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { RouteDefinitionParams } from '..';
import { KIBANA_ADMIN_ROLE_NAME, KIBANA_USER_ROLE_NAME } from '../../deprecations';
import {
  getDetailedErrorMessage,
  getErrorStatusCode,
  wrapIntoCustomErrorResponse,
} from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Defines routes required to handle `kibana_user` deprecation.
 */
export function defineKibanaUserRoleDeprecationRoutes({ router, logger }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/deprecations/kibana_user_role/_fix_users',
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      let users: estypes.SecurityGetUserResponse;
      try {
        users = await context.core.elasticsearch.client.asCurrentUser.security.getUser();
      } catch (err) {
        if (getErrorStatusCode(err) === 403) {
          logger.warn(
            `Failed to retrieve users when checking for deprecations: the manage_security cluster privilege is required`
          );
        } else {
          logger.error(
            `Failed to retrieve users when checking for deprecations, unexpected error: ${getDetailedErrorMessage(
              err
            )}`
          );
        }
        return response.customError(wrapIntoCustomErrorResponse(err));
      }

      const usersWithKibanaUserRole = Object.values(users).filter((user) =>
        user.roles.includes(KIBANA_USER_ROLE_NAME)
      );

      if (usersWithKibanaUserRole.length === 0) {
        logger.debug(`No users with "${KIBANA_USER_ROLE_NAME}" role found.`);
      } else {
        logger.debug(
          `The following users with "${KIBANA_USER_ROLE_NAME}" role found and will be migrated to "${KIBANA_ADMIN_ROLE_NAME}" role: ${usersWithKibanaUserRole
            .map((user) => user.username)
            .join(', ')}.`
        );
      }

      for (const userToUpdate of usersWithKibanaUserRole) {
        const roles = userToUpdate.roles.filter((role) => role !== KIBANA_USER_ROLE_NAME);
        if (!roles.includes(KIBANA_ADMIN_ROLE_NAME)) {
          roles.push(KIBANA_ADMIN_ROLE_NAME);
        }

        try {
          await context.core.elasticsearch.client.asCurrentUser.security.putUser({
            username: userToUpdate.username,
            body: { ...userToUpdate, roles },
          });
        } catch (err) {
          logger.error(
            `Failed to update user "${userToUpdate.username}": ${getDetailedErrorMessage(err)}.`
          );
          return response.customError(wrapIntoCustomErrorResponse(err));
        }

        logger.debug(`Successfully updated user "${userToUpdate.username}".`);
      }

      return response.ok({ body: {} });
    })
  );

  router.post(
    {
      path: '/internal/security/deprecations/kibana_user_role/_fix_role_mappings',
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      let roleMappings: estypes.SecurityGetRoleMappingResponse;
      try {
        roleMappings =
          await context.core.elasticsearch.client.asCurrentUser.security.getRoleMapping();
      } catch (err) {
        logger.error(`Failed to retrieve role mappings: ${getDetailedErrorMessage(err)}.`);
        return response.customError(wrapIntoCustomErrorResponse(err));
      }

      const roleMappingsWithKibanaUserRole = Object.entries(roleMappings).filter(([, mapping]) =>
        mapping.roles.includes(KIBANA_USER_ROLE_NAME)
      );

      if (roleMappingsWithKibanaUserRole.length === 0) {
        logger.debug(`No role mappings with "${KIBANA_USER_ROLE_NAME}" role found.`);
      } else {
        logger.debug(
          `The following role mappings with "${KIBANA_USER_ROLE_NAME}" role found and will be migrated to "${KIBANA_ADMIN_ROLE_NAME}" role: ${roleMappingsWithKibanaUserRole
            .map(([mappingName]) => mappingName)
            .join(', ')}.`
        );
      }

      for (const [mappingNameToUpdate, mappingToUpdate] of roleMappingsWithKibanaUserRole) {
        const roles = mappingToUpdate.roles.filter((role) => role !== KIBANA_USER_ROLE_NAME);
        if (!roles.includes(KIBANA_ADMIN_ROLE_NAME)) {
          roles.push(KIBANA_ADMIN_ROLE_NAME);
        }

        try {
          await context.core.elasticsearch.client.asCurrentUser.security.putRoleMapping({
            name: mappingNameToUpdate,
            body: { ...mappingToUpdate, roles },
          });
        } catch (err) {
          logger.error(
            `Failed to update role mapping "${mappingNameToUpdate}": ${getDetailedErrorMessage(
              err
            )}.`
          );
          return response.customError(wrapIntoCustomErrorResponse(err));
        }

        logger.debug(`Successfully updated role mapping "${mappingNameToUpdate}".`);
      }

      return response.ok({ body: {} });
    })
  );
}
