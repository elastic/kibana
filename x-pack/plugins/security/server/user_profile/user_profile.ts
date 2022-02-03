/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from '../../common';

export interface UserInfo extends User {
  display_name?: string;
  avatar?: {
    initials?: string;
    color?: string;
    image_url?: string;
  };
  active: boolean;
}

export type UserData = Record<string, unknown>;

/**
 * Describes properties of the user's profile.
 */
export interface UserProfile<T extends UserData = Record<string, unknown>> {
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
