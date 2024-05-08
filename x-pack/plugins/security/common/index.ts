/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  GetUserProfileResponse,
  ApiKey,
  RestApiKey,
  GetUserDisplayNameParams,
  EditUser,
  BuiltinESPrivileges,
  RawKibanaPrivileges,
  RoleMapping,
  RoleTemplate,
  StoredRoleTemplate,
  InvalidRoleTemplate,
  InlineRoleTemplate,
} from './model';
export { getUserDisplayName, isRoleReserved, isRoleWithWildcardBasePrivilege } from './model';

// Re-export types from the plugin directly to enhance the developer experience for consumers of the Security plugin.
export type {
  AuthenticatedUser,
  UserRealm,
  User,
  AuthenticationProvider,
  Role,
  RoleIndexPrivilege,
  RoleKibanaPrivilege,
  RoleRemoteIndexPrivilege,
  RoleRemoteClusterPrivilege,
  FeaturesPrivileges,
  LoginLayout,
  SecurityLicenseFeatures,
  SecurityLicense,
  UserProfile,
  UserProfileUserInfo,
  UserProfileWithSecurity,
  UserProfileData,
  UserProfileLabels,
  UserProfileUserInfoWithSecurity,
} from '@kbn/security-plugin-types-common';
