/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UserProfileSettingsClientContract } from '@kbn/core-user-settings-server';

import type { UserSettingServiceStart } from './user_setting_service';
/**
 * A wrapper client around {@link UserSettingServiceStart} that exposes a method to get the current user's profile
 */
export class UserProfileSettingsClient implements UserProfileSettingsClientContract {
  private userSettingServiceStart: UserSettingServiceStart | undefined;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Returns the current user's user profile settings
   *
   * @param request the KibanaRequest that is required to get the current user and their settings
   * @return the User Settings values retrieved from the UserSettingsServiceStart, if it has been set, otherwise,
   * default to an empty Record
   */
  async get(request: KibanaRequest): Promise<Record<string, string>> {
    let result: Record<string, string> = {} as Record<string, string>;

    if (this.userSettingServiceStart) {
      result = await this.userSettingServiceStart.getCurrentUserProfileSettings(request);
    } else {
      this.logger.debug('UserSettingsServiceStart has not been set yet');
    }

    return result;
  }

  setUserSettingsServiceStart(userSettingServiceStart: UserSettingServiceStart) {
    this.userSettingServiceStart = userSettingServiceStart;
  }
}
