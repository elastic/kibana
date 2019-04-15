/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';
import { Role } from '../../common/model/role';
import { User } from '../../common/model/user';

const usersUrl = '/api/security/v1/users';
const rolesUrl = '/api/security/role';

export class UserAPIClient {
  public static async getCurrentUser(): Promise<User> {
    return await kfetch({ pathname: `/api/security/v1/me` });
  }

  public static async getUsers(): Promise<User[]> {
    return await kfetch({ pathname: usersUrl });
  }

  public static async getUser(username: string): Promise<User> {
    const url = `${usersUrl}/${encodeURIComponent(username)}`;
    return await kfetch({ pathname: url });
  }

  public static async deleteUser(username: string) {
    const url = `${usersUrl}/${encodeURIComponent(username)}`;
    await kfetch({ pathname: url, method: 'DELETE' }, {});
  }

  public static async saveUser(user: User) {
    const url = `${usersUrl}/${encodeURIComponent(user.username)}`;
    await kfetch({ pathname: url, body: JSON.stringify(user), method: 'POST' });
  }

  public static async getRoles(): Promise<Role[]> {
    return await kfetch({ pathname: rolesUrl });
  }

  public static async getRole(name: string): Promise<Role> {
    const url = `${rolesUrl}/${encodeURIComponent(name)}`;
    return await kfetch({ pathname: url });
  }

  public static async changePassword(username: string, password: string, currentPassword: string) {
    const data: Record<string, string> = {
      newPassword: password,
    };
    if (currentPassword) {
      data.password = currentPassword;
    }
    await kfetch({
      pathname: `${usersUrl}/${encodeURIComponent(username)}/password`,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
