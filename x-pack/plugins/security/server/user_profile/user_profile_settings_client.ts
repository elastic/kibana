/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';

import type { UserSettingServiceStart } from './user_setting_service';

/**
 * A wrapper client around {@link UserSettingServiceStart} that exposes a method to get the current user's profile
 */
export class UserProfileSettingsClient implements UserProfileSettingsClientContract {
  private userSettingsServiceStart: UserSettingServiceStart;

  constructor(userSettingsServiceStart: UserSettingServiceStart) {
    this.userSettingsServiceStart = userSettingsServiceStart;
  }

  /**
   * Returns the current user's user profile settings
   *
   * @param request
   */
  async get(request: KibanaRequest): Promise<Record<string, string>> {
    return await this.userSettingsServiceStart.getCurrentUserProfileSettings(request);
  }
}

/**
 * Provider to invoke to retrieve a UserProfilesClientFactory.
 */
export type UserProfileSettingsClientFactoryProvider = () => UserProfileSettingsClientFactory;

// Describes the factory used to create instances of the UserProfileSettingsClient
export type UserProfileSettingsClientFactory = () => UserProfileSettingsClientContract;

/**
 * Describes the functions that will be provided by a UserProfileSettingsClient
 */
export interface UserProfileSettingsClientContract {
  get(request: KibanaRequest): Promise<Record<string, string>>;
}
