/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLicensedRouteHandler } from '../licensed_route_handler';
import { wrapError } from '../../errors';
import { RouteDefinitionParams } from '..';

interface UserInfo {
  username: string;
  roles: string[];
  full_name: string | null;
  email: string | null;
  metadata: {
    [key: string]: any;
  };
  enabled: boolean;
}

const isUsingDeprecatedRole = (users: Record<string, UserInfo>, role: string) => {
  const usersWithDeprecatedRoles = Object.keys(users).filter((user) => {
    return users[user].roles.includes(role);
  });

  return usersWithDeprecatedRoles.map((user) => {
    const userInfo = users[user];
    return {
      message: `User '${userInfo.username}' is using a deprecated role: '${role}'`,
      correctiveAction: '',
      documentationUrl: '',
      level: 'critical',
    };
  });
};

const isUsingDeprecatedUser = (users: Record<string, UserInfo>, username: string) => {
  const deprecatedUsers = Object.keys(users).filter((user) => {
    return users[user].username === username;
  });

  return deprecatedUsers.map((user) => {
    const userInfo = users[user];
    return {
      message: `User '${userInfo.username}' has been deprecated.`,
      correctiveAction: '',
      documentationUrl: '',
      level: 'critical',
    };
  });
};

export function defineDeprecationsGetRoutes(params: RouteDefinitionParams) {
  const { logger, router } = params;

  router.get(
    {
      path: '/internal/security/deprecations',
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const {
          body: usersResponse,
        } = await context.core.elasticsearch.client.asCurrentUser.security.getUser<
          Record<string, UserInfo>
        >();

        const usersWithDeprecatedRoles = [
          ...isUsingDeprecatedRole(usersResponse, 'kibana_user'),
          ...isUsingDeprecatedRole(usersResponse, 'kibana_dashboard_only_user'),
        ];
        const deprecatedUsers = isUsingDeprecatedUser(usersResponse, 'kibana');

        const deprecations = [...usersWithDeprecatedRoles, ...deprecatedUsers];

        return response.ok({ body: deprecations });
      } catch (error) {
        const wrappedError = wrapError(error);
        return response.customError({
          body: wrappedError,
          statusCode: wrappedError.output.statusCode,
        });
      }
    })
  );
}
