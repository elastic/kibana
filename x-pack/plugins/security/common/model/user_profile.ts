/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VISUALIZATION_COLORS } from '@elastic/eui';

import type { AuthenticationProvider, User } from '../';
import { getUserDisplayName } from './user';

export interface UserInfo extends User {
  active: boolean;
}

export interface UserAvatar {
  initials?: string;
  color?: string;
  imageUrl?: string;
}

export type UserData = Record<string, unknown>;

/**
 * Describes properties of the user's profile.
 */
export interface UserProfile<T extends UserData = UserData> {
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
  user: UserInfo;

  /**
   * User specific data associated with the profile.
   */
  data: T;
}

/**
 * User profile enriched with session information.
 */
export interface AuthenticatedUserProfile<T extends UserData = UserData> extends UserProfile<T> {
  /**
   * Authentication provider of this user's session.
   */
  authentication_provider: AuthenticationProvider;
}

const USER_AVATAR_FALLBACK_CODE_POINT = 97; // code point for lowercase "a"
const USER_AVATAR_MAX_INITIALS = 2;

/**
 * Determines the color for the provided user profile.
 * If a color is present on the user profile itself, then that is used.
 * Otherwise, a color is provided from EUI's Visualization Colors based on the display name.
 *
 * @param {UserInfo} user User info
 * @param {UserAvatar} avatar User avatar
 */
export function getUserAvatarColor(
  user: Pick<UserInfo, 'username' | 'full_name'>,
  avatar?: UserAvatar
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
 * @param {UserInfo} user User info
 * @param {UserAvatar} avatar User avatar
 */
export function getUserAvatarInitials(
  user: Pick<UserInfo, 'username' | 'full_name'>,
  avatar?: UserAvatar
) {
  if (avatar && avatar.initials) {
    return avatar.initials;
  }

  const words = getUserDisplayName(user).split(' ');
  const numInitials = Math.min(USER_AVATAR_MAX_INITIALS, words.length);

  words.splice(numInitials, words.length);

  return words.map((word) => word.substring(0, 1)).join('');
}
