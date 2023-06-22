/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VISUALIZATION_COLORS } from '@elastic/eui';

import type { AuthenticatedUser } from './authenticated_user';
import { getUserDisplayName } from './user';

/**
 * IMPORTANT:
 *
 * The types in this file are duplicated at
 * `packages/kbn-user-profile-components/src/user_profile.ts`
 *
 * When making changes please ensure to keep both files in sync.
 */

/**
 * Describes basic properties stored in user profile.
 */
export interface UserProfile<D extends UserProfileData = UserProfileData> {
  /**
   * Unique ID for of the user profile.
   */
  uid: string;

  /**
   * Indicates whether user profile is enabled or not.
   */
  enabled: boolean;

  /**
   * Information about the user that owns profile.
   */
  user: UserProfileUserInfo;

  /**
   * User specific data associated with the profile.
   */
  data: Partial<D>;
}

/**
 * Basic user information returned in user profile.
 */
export interface UserProfileUserInfo {
  /**
   * Username of the user.
   */
  username: string;
  /**
   * Optional email of the user.
   */
  email?: string;
  /**
   * Optional full name of the user.
   */
  full_name?: string;
}

/**
 * Placeholder for data stored in user profile.
 */
export type UserProfileData = Record<string, unknown>;

/**
 * Type of the user profile labels structure (currently
 */
export type UserProfileLabels = Record<string, string>;

/**
 * Avatar stored in user profile.
 */
export interface UserProfileAvatarData {
  /**
   * Optional initials (two letters) of the user to use as avatar if avatar picture isn't specified.
   */
  initials?: string;
  /**
   * Background color of the avatar when initials are used.
   */
  color?: string;
  /**
   * Base64 data URL for the user avatar image.
   */
  imageUrl?: string;
}

/**
 * User settings stored in the data object of the User Profile
 */
export interface UserSettingsData {
  darkMode?: string;
}

/**
 * Extended user information returned in user profile (both basic and security related properties).
 */
export interface UserProfileUserInfoWithSecurity extends UserProfileUserInfo {
  /**
   * List of the user roles.
   */
  roles: readonly string[];
  /**
   * Name of the Elasticsearch security realm that was used to authenticate user.
   */
  realm_name: string;
  /**
   * Optional name of the security domain that Elasticsearch security realm that was
   * used to authenticate user resides in (if any).
   */
  realm_domain?: string;
}

/**
 * Describes all properties stored in user profile (both basic and security related properties).
 */
export interface UserProfileWithSecurity<
  D extends UserProfileData = UserProfileData,
  L extends UserProfileLabels = UserProfileLabels
> extends UserProfile<D> {
  /**
   * Information about the user that owns profile.
   */
  user: UserProfileUserInfoWithSecurity;

  /**
   * User specific _searchable_ labels associated with the profile. Note that labels are considered
   * security related field since it's going to be used to store user's space ID.
   */
  labels: L;
}

/**
 * User profile enriched with session information.
 */
export interface GetUserProfileResponse<D extends UserProfileData = UserProfileData>
  extends UserProfileWithSecurity<D> {
  /**
   * Information about the currently authenticated user that owns the profile.
   */
  user: UserProfileWithSecurity['user'] & Pick<AuthenticatedUser, 'authentication_provider'>;
}

export const USER_AVATAR_FALLBACK_CODE_POINT = 97; // code point for lowercase "a"
export const USER_AVATAR_MAX_INITIALS = 2;

/**
 * Determines the color for the provided user profile.
 * If a color is present on the user profile itself, then that is used.
 * Otherwise, a color is provided from EUI's Visualization Colors based on the display name.
 *
 * @param {UserProfileUserInfo} user User info
 * @param {UserProfileAvatarData} avatar User avatar
 */
export function getUserAvatarColor(
  user: Pick<UserProfileUserInfo, 'username' | 'full_name'>,
  avatar?: UserProfileAvatarData
) {
  if (avatar && avatar.color) {
    return avatar.color;
  }

  const firstCodePoint = getUserDisplayName(user).codePointAt(0) || USER_AVATAR_FALLBACK_CODE_POINT;

  return VISUALIZATION_COLORS[firstCodePoint % VISUALIZATION_COLORS.length];
}

/**
 * Determines the initials for the provided user profile.
 * If initials are present on the user profile itself, then that is used.
 * Otherwise, the initials are calculated based off the words in the display name, with a max length of 2 characters.
 *
 * @param {UserProfileUserInfo} user User info
 * @param {UserProfileAvatarData} avatar User avatar
 */
export function getUserAvatarInitials(
  user: Pick<UserProfileUserInfo, 'username' | 'full_name'>,
  avatar?: UserProfileAvatarData
) {
  if (avatar && avatar.initials) {
    return avatar.initials;
  }

  const words = getUserDisplayName(user).split(' ');
  const numInitials = Math.min(USER_AVATAR_MAX_INITIALS, words.length);

  words.splice(numInitials, words.length);

  return words.map((word) => word.substring(0, 1)).join('');
}
