/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { Role } from '@kbn/security-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import { inspect } from 'util';
import type { AxiosError } from 'axios';
import { COMMON_API_HEADERS } from './constants';

const ignoreHttp409Error = (error: AxiosError) => {
  if (error?.response?.status === 409) {
    return;
  }

  throw error;
};

export interface LoadedRoleAndUser {
  role: string;
  username: string;
  password: string;
}

/**
 * A generic class for loading roles and creating associated user into kibana
 */
export class RoleAndUserLoader<R extends Record<string, Role> = Record<string, Role>> {
  protected readonly logPromiseError: (error: Error) => never;

  constructor(
    protected readonly kbnClient: KbnClient,
    protected readonly logger: ToolingLog,
    protected readonly roles: R
  ) {
    this.logPromiseError = (error) => {
      this.logger.error(inspect(error, { depth: 5 }));
      throw error;
    };
  }

  /**
   * Loads the requested role into Kibana and creates (or updates, if it already exists) a user by
   * the same name that is assigned the role just created.
   * @param name
   */
  async load(name: keyof R): Promise<LoadedRoleAndUser> {
    const role = this.roles[name];

    if (!role) {
      throw new Error(
        `Unknown role: [${String(name)}]. Valid values are: [${Object.keys(this.roles).join(', ')}]`
      );
    }

    const roleName = role.name;

    await this.createRole(role);
    await this.createUser(roleName, 'changeme', [roleName]);

    return {
      role: roleName,
      username: roleName,
      password: 'changeme',
    };
  }

  private async createRole(role: Role): Promise<void> {
    const { name: roleName, ...roleDefinition } = role;

    this.logger.debug(`creating role:`, roleDefinition);

    await this.kbnClient
      .request({
        method: 'PUT',
        path: `/api/security/role/${roleName}`,
        headers: {
          ...COMMON_API_HEADERS,
        },
        body: roleDefinition,
      })
      .then((response) => {
        this.logger.info(`Role [${roleName}] created/updated`, response?.data);
        return response;
      })
      .catch(ignoreHttp409Error)
      .catch(this.logPromiseError);
  }

  private async createUser(
    username: string,
    password: string,
    roles: string[] = []
  ): Promise<void> {
    const user = {
      username,
      password,
      roles,
      full_name: username,
      email: '',
    };

    this.logger.debug(`creating user:`, user);

    await this.kbnClient
      .request({
        method: 'POST',
        path: `/internal/security/users/${username}`,
        headers: {
          ...COMMON_API_HEADERS,
        },
        body: user,
      })
      .then((response) => {
        this.logger.info(`User [${username}] created/updated`, response?.data);
        return response;
      })
      .catch(ignoreHttp409Error)
      .catch(this.logPromiseError);
  }
}
