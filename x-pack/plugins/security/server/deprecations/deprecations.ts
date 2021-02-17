/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeprecationDependencies } from 'src/plugins/deprecations/server';

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

const getRoleDeprecations = ({
  users,
  deprecatedRole,
  manualSteps,
  apiInfo,
}: {
  users: Record<string, UserInfo>;
  deprecatedRole: string;
  manualSteps?: string[];
  apiInfo?: {
    newRole: string;
  };
}) => {
  const usersWithDeprecatedRoles = Object.keys(users).filter((user) => {
    return users[user].roles.includes(deprecatedRole);
  });

  return usersWithDeprecatedRoles.map((user) => {
    const userInfo = users[user];
    const filteredRoles = userInfo.roles.filter((userInfoRole) => userInfoRole !== deprecatedRole);

    return {
      message: `User '${userInfo.username}' is using a deprecated role: '${deprecatedRole}'`,
      correctiveActions: {
        api: apiInfo
          ? {
              path: `/internal/security/users/${userInfo.username}`,
              method: 'POST',
              body: {
                ...userInfo,
                roles: [...filteredRoles, apiInfo.newRole],
              },
            }
          : undefined,
        manualSteps,
      },
      documentationUrl:
        'https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-put-user.html',
      level: 'critical',
    };
  });
};

const getUserDeprecations = ({
  users,
  deprecatedUser,
  manualSteps,
}: {
  users: Record<string, UserInfo>;
  deprecatedUser: string;
  manualSteps: string[];
}) => {
  const deprecatedUsers = Object.keys(users).filter((user) => {
    return users[user].username === deprecatedUser;
  });

  return deprecatedUsers.map((user) => {
    const userInfo = users[user];
    return {
      message: `User '${userInfo.username}' has been deprecated.`,
      correctiveActions: {
        manualSteps,
      },
      documentationUrl:
        'https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-put-user.html',
      level: 'critical',
    };
  });
};

export const getDeprecations = async ({ esClient }: DeprecationDependencies) => {
  try {
    const { body: usersResponse } = await esClient.asCurrentUser.security.getUser<
      Record<string, UserInfo>
    >();

    const usersWithDeprecatedKibanaUserRole = getRoleDeprecations({
      users: usersResponse,
      deprecatedRole: 'kibana_user',
      apiInfo: {
        newRole: 'kibana_admin',
      },
      manualSteps: [
        'Using Kibana user management, change all users using the kibana_user role to the kibana_admin role.',
        'Using Kibana role-mapping management, change all role-mappings which assing the kibana_user role to the kibana_admin role.',
      ],
    });

    const usersWithDeprecatedDashboardRole = getRoleDeprecations({
      users: usersResponse,
      deprecatedRole: 'kibana_dashboard_only_user',
      manualSteps: [
        'Using Kibana role management, create a new custom role.',
        'Assign read-only access to the Dashboard feature.',
        'Assign this role in place of the dashboard_only role.',
      ],
    });

    const deprecatedUsers = getUserDeprecations({
      users: usersResponse,
      deprecatedUser: 'kibana',
      manualSteps: [
        'Using Kibana user management, set the password for the kibana_system user',
        'Update all kibana.yml files to use this username and password for elasticsearch.username and elasticsearch.password',
      ],
    });

    const deprecations = [
      ...usersWithDeprecatedKibanaUserRole,
      ...usersWithDeprecatedDashboardRole,
      ...deprecatedUsers,
    ];

    return deprecations;
  } catch (error) {
    // TODO handle error
    // eslint-disable-next-line no-console
    console.log('error', error);
  }
};
