/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { KbnClient } from '@kbn/test';
import type { Role } from '@kbn/security-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import { inspect } from 'util';
import type { AxiosError } from 'axios';
import type { EndpointSecurityRoleDefinitions } from './roles_users';
import { getAllEndpointSecurityRoles } from './roles_users';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';
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

export interface RoleAndUserLoaderInterface<R extends Record<string, Role> = Record<string, Role>> {
  /**
   * Loads the requested Role into kibana and then creates a user by the same role name that is
   * assigned to the given role
   * @param name
   */
  load(name: keyof R): Promise<LoadedRoleAndUser>;

  /**
   * Loads all roles/users
   */
  loadAll(): Promise<Record<keyof R, LoadedRoleAndUser>>;

  /**
   * Creates a new Role in kibana along with a user (by the same name as the Role name)
   * that is assigned to the given role
   * @param role
   */
  create(role: Role): Promise<LoadedRoleAndUser>;
}

/**
 * A generic class for loading roles and creating associated user into kibana
 */
export class RoleAndUserLoader<R extends Record<string, Role> = Record<string, Role>>
  implements RoleAndUserLoaderInterface<R>
{
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

  async load(name: keyof R): Promise<LoadedRoleAndUser> {
    const role = this.roles[name];

    if (!role) {
      throw new Error(
        `Unknown role/user: [${String(name)}]. Valid values are: [${Object.keys(this.roles).join(
          ', '
        )}]`
      );
    }

    return this.create(role);
  }

  async loadAll(): Promise<Record<keyof R, LoadedRoleAndUser>> {
    const response = {} as Record<keyof R, LoadedRoleAndUser>;

    for (const [name, role] of Object.entries(this.roles)) {
      response[name as keyof R] = await this.create(role);
    }

    return response;
  }

  public async create(role: Role): Promise<LoadedRoleAndUser> {
    const roleName = role.name;

    await this.createRole(role);
    await this.createUser(roleName, 'changeme', [roleName]);

    return {
      role: roleName,
      username: roleName,
      password: 'changeme',
    };
  }

  protected async createRole(role: Role): Promise<void> {
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
        this.logger.debug(`Role [${roleName}] created/updated`, response?.data);
        return response;
      })
      .catch(ignoreHttp409Error)
      .catch(catchAxiosErrorFormatAndThrow)
      .catch(this.logPromiseError);
  }

  protected async createUser(
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
        this.logger.debug(`User [${username}] created/updated`, response?.data);
        return response;
      })
      .catch(ignoreHttp409Error)
      .catch(catchAxiosErrorFormatAndThrow)
      .catch(this.logPromiseError);
  }
}

/**
 * Role and user loader for Endpoint security dev/testing
 */
export class EndpointSecurityTestRolesLoader extends RoleAndUserLoader<EndpointSecurityRoleDefinitions> {
  constructor(protected readonly kbnClient: KbnClient, protected readonly logger: ToolingLog) {
    super(kbnClient, logger, getAllEndpointSecurityRoles());
  }
}
