/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, IClusterClient, IScopedClusterClient } from 'kibana/server';

export interface DeprecationsServiceSetup {
  getClusterClient: () => Promise<IClusterClient>;
}

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

export class DeprecationsService {
  private elasticsearchClient?: IClusterClient;

  private isUsingDeprecatedRole(users: Record<string, UserInfo>, role: string) {
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
  }

  private isUsingDeprecatedUser(users: Record<string, UserInfo>, username: string) {
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
  }

  public async setup() {}

  public async getDeprecations(esClient: IScopedClusterClient) {
    try {
      const { body: usersResponse } = await esClient.asCurrentUser.security.getUser<
        Record<string, UserInfo>
      >();

      const usersWithDeprecatedKibanaUserRole = this.isUsingDeprecatedRole(
        usersResponse,
        'kibana_user'
      );
      const usersWithDeprecatedDashboardRole = this.isUsingDeprecatedRole(
        usersResponse,
        'kibana_dashboard_only_user'
      );

      const deprecatedUsers = this.isUsingDeprecatedUser(usersResponse, 'kibana');

      const deprecations = [
        ...usersWithDeprecatedKibanaUserRole,
        ...usersWithDeprecatedDashboardRole,
        ...deprecatedUsers,
      ];

      return deprecations;
    } catch (error) {
      // TODO handle error
      console.log('error', error);
    }
  }
}
