/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import chrome from 'ui/chrome';

const usersUrl = chrome.addBasePath('/api/security/v1/users/');
const rolesUrl = chrome.addBasePath('/api/security/v1/roles/');

export const createApiClient = (httpClient) => {
  return {
    async getCurrentUser() {
      const url = chrome.addBasePath('/api/security/v1/me');
      const { data } = await httpClient.get(url);
      return data;
    },
    async getUsers() {
      const url = chrome.addBasePath(usersUrl);
      const { data } = await httpClient.get(url);
      return data;
    },
    async getUser(username) {
      const url = chrome.addBasePath(`${usersUrl}${username}`);
      const { data } = await httpClient.get(url);
      return data;
    },
    async getRoles() {
      const url = chrome.addBasePath(rolesUrl);
      const { data } = await httpClient.get(url);
      return data;
    },
    async getRole(name) {
      const url = chrome.addBasePath(`${rolesUrl}${name}`);
      const { data } = await httpClient.get(url);
      return data;
    }
  };
};
