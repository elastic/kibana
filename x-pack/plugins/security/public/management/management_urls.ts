/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// const MANAGEMENT_PATH = '/management';
// const SECURITY_PATH = `${MANAGEMENT_PATH}/security`;
// export const ROLES_PATH = `/roles`;
export const EDIT_ROLES_PATH = `/edit`;
export const CLONE_ROLES_PATH = `/clone`;
export const USERS_PATH = `../users`;
export const EDIT_USERS_PATH = `${USERS_PATH}/edit`;

export const getEditRoleHref = (roleName: string) =>
  `../roles/edit/${encodeURIComponent(roleName)}`;

export const getEditRoleMappingHref = (roleMappingName: string) =>
  `${EDIT_ROLES_PATH}/${encodeURIComponent(roleMappingName)}`;
