/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { omit } from 'lodash';
import chrome from 'ui/chrome';
import { Role } from '../../../common/model/role';

const apiBase = chrome.addBasePath(`/api/security/role`);

export async function saveRole($http: any, role: Role) {
  const data = omit(role, 'name', 'transient_metadata', '_unrecognized_applications');
  return await $http.put(`${apiBase}/${role.name}`, data);
}

export async function deleteRole($http: any, name: string) {
  return await $http.delete(`${apiBase}/${name}`);
}
