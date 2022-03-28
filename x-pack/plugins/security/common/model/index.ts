/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ApiKey, ApiKeyToInvalidate, ApiKeyRoleDescriptors } from './api_key';
export type { User, EditUser } from './user';
export type {
  AuthenticatedUserProfile,
  UserProfile,
  UserData,
  UserInfo,
  UserAvatar,
} from './user_profile';
export {
  getUserAvatarColor,
  getUserAvatarInitials,
  USER_AVATAR_MAX_INITIALS,
} from './user_profile';
export { getUserDisplayName } from './user';
export type { AuthenticatedUser, UserRealm } from './authenticated_user';
export { canUserChangePassword, canUserChangeDetails, isUserAnonymous } from './authenticated_user';
export type { AuthenticationProvider } from './authentication_provider';
export { shouldProviderUseLoginForm } from './authentication_provider';
export type { BuiltinESPrivileges } from './builtin_es_privileges';
export type { RawKibanaPrivileges, RawKibanaFeaturePrivileges } from './raw_kibana_privileges';
export type { FeaturesPrivileges } from './features_privileges';
export type { Role, RoleIndexPrivilege, RoleKibanaPrivilege } from './role';
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
} from './role';
export type {
  InlineRoleTemplate,
  StoredRoleTemplate,
  InvalidRoleTemplate,
  RoleTemplate,
  RoleMapping,
} from './role_mapping';
export type {
  PrivilegeDeprecationsRolesByFeatureIdRequest,
  PrivilegeDeprecationsRolesByFeatureIdResponse,
  PrivilegeDeprecationsService,
} from './deprecations';
