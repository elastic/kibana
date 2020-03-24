/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const MANAGEMENT_PATH = '/management';
const SECURITY_PATH = `${MANAGEMENT_PATH}/security`;
export const ROLES_PATH = `${SECURITY_PATH}/roles`;
export const EDIT_ROLES_PATH = `${ROLES_PATH}/edit`;
export const CLONE_ROLES_PATH = `${ROLES_PATH}/clone`;
export const USERS_PATH = `${SECURITY_PATH}/users`;
export const EDIT_USERS_PATH = `${USERS_PATH}/edit`;
export const ROLE_MAPPINGS_PATH = `${SECURITY_PATH}/role_mappings`;
const CREATE_ROLE_MAPPING_PATH = `${ROLE_MAPPINGS_PATH}/edit`;

export const getEditRoleHref = (roleName: string) =>
  `#${ROLES_PATH}/edit/${encodeURIComponent(roleName)}`;

export const getCreateRoleMappingHref = () => `#${CREATE_ROLE_MAPPING_PATH}`;

export const getEditRoleMappingHref = (roleMappingName: string) =>
  `#${CREATE_ROLE_MAPPING_PATH}/${encodeURIComponent(roleMappingName)}`;
