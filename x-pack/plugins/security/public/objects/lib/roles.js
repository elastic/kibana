/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';

const apiBase = chrome.addBasePath(`/api/security/v1/roles`);

export async function saveRole($http, role) {
  return await $http.post(`${apiBase}/${role.name}`, role);
}

export async function deleteRole($http, name) {
  return await $http.delete(`${apiBase}/${name}`);
}
