/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

import type { EditUser, User } from '../../../common/model';

const usersUrl = '/internal/security/users';

export class UserAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async getUsers() {
    return await this.http.get<User[]>(usersUrl);
  }

  public async getUser(username: string) {
    return await this.http.get<User>(`${usersUrl}/${encodeURIComponent(username)}`);
  }

  public async deleteUser(username: string) {
    await this.http.delete(`${usersUrl}/${encodeURIComponent(username)}`);
  }

  public async saveUser(user: EditUser) {
    await this.http.post(`${usersUrl}/${encodeURIComponent(user.username)}`, {
      body: JSON.stringify(user),
    });
  }

  public async changePassword(username: string, password: string, currentPassword?: string) {
    const data: Record<string, string> = {
      newPassword: password,
    };
    if (currentPassword) {
      data.password = currentPassword;
    }

    await this.http.post(`${usersUrl}/${encodeURIComponent(username)}/password`, {
      body: JSON.stringify(data),
    });
  }

  public async disableUser(username: string) {
    await this.http.post(`${usersUrl}/${encodeURIComponent(username)}/_disable`);
  }

  public async enableUser(username: string) {
    await this.http.post(`${usersUrl}/${encodeURIComponent(username)}/_enable`);
  }
}
