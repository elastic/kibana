/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';
import { omit } from 'lodash';

const apiBase = chrome.addBasePath(`/api/security/role`);

export async function saveRole($http, role) {
  const data = omit(role, 'name', 'transient_metadata', '_unrecognized_applications');
  return await $http.put(`${apiBase}/${role.name}`, data);
}

export async function deleteRole($http, name) {
  return await $http.delete(`${apiBase}/${name}`);
}
