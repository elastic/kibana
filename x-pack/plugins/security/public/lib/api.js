/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';

const usersUrl = chrome.addBasePath('/api/security/v1/users');
const rolesUrl = chrome.addBasePath('/api/security/role');

export const createApiClient = (httpClient) => {
  return {
    async getCurrentUser() {
      const url = chrome.addBasePath('/api/security/v1/me');
      const { data } = await httpClient.get(url);
      return data;
    },
    async getUsers() {
      const { data } = await httpClient.get(usersUrl);
      return data;
    },
    async getUser(username) {
      const url = `${usersUrl}/${username}`;
      const { data } = await httpClient.get(url);
      return data;
    },
    async deleteUser(username) {
      const url = `${usersUrl}/${username}`;
      await httpClient.delete(url);
    },
    async saveUser(user) {
      const url = `${usersUrl}/${user.username}`;
      await httpClient.post(url, user);
    },
    async getRoles() {
      const { data } = await httpClient.get(rolesUrl);
      return data;
    },
    async getRole(name) {
      const url = `${rolesUrl}/${name}`;
      const { data } = await httpClient.get(url);
      return data;
    },
    async changePassword(username, password, currentPassword) {
      const data = {
        newPassword: password,
      };
      if (currentPassword) {
        data.password = currentPassword;
      }
      await httpClient
        .post(`${usersUrl}/${username}/password`, data);
    }
  };
};
