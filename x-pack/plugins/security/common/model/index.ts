/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { EditUser, GetUserDisplayNameParams } from './user';
export type { GetUserProfileResponse } from './user_profile';
export {
  getUserAvatarColor,
  getUserAvatarInitials,
  USER_AVATAR_MAX_INITIALS,
} from './user_profile';
export { getUserDisplayName } from './user';
export {
  canUserChangePassword,
  canUserChangeDetails,
  isUserAnonymous,
  canUserHaveProfile,
} from './authenticated_user';
export { shouldProviderUseLoginForm } from './authentication_provider';
export type { BuiltinESPrivileges } from './builtin_es_privileges';
export type {
  RawKibanaPrivileges,
  RawKibanaFeaturePrivileges,
} from '@kbn/security-authorization-core';
export {
  copyRole,
  isRoleDeprecated,
  isRoleReadOnly,
  isRoleReserved,
  isRoleSystem,
  isRoleAdmin,
  isRoleEnabled,
  prepareRoleClone,
  getExtendedRoleDeprecationNotice,
  isRoleWithWildcardBasePrivilege,
} from './role';
export type {
  InlineRoleTemplate,
  StoredRoleTemplate,
  InvalidRoleTemplate,
  RoleTemplate,
  RoleMapping,
  RoleMappingRule,
  RoleMappingAllRule,
  RoleMappingAnyRule,
  RoleMappingExceptRule,
  RoleMappingFieldRule,
} from './role_mapping';
