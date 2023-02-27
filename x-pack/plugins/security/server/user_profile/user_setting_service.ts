/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';

import type { UserProfileGetCurrentParams, UserProfileServiceStart } from './user_profile_service';

export interface UserSettingServiceStart {
  getCurrentUserProfileSettings(request: KibanaRequest): Promise<Record<string, string>>;
}

/**
 * A service that wraps the {@link UserProfileServiceStart} so that only the 'getCurrent' method is made available
 */
export class UserSettingService {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  start(userProfileServiceStart: UserProfileServiceStart): UserSettingServiceStart {
    return {
      getCurrentUserProfileSettings: async (request) => {
        const params: UserProfileGetCurrentParams = {
          request,
          dataPath: '*',
        };

        const currentUserProfile = await userProfileServiceStart.getCurrent(params);

        let result = {} as Record<string, string>;

        if (currentUserProfile?.data?.userSettings) {
          result = currentUserProfile?.data?.userSettings as Record<string, string>;
        } else {
          this.logger.warn('User Settings not found.');
        }
        return result;
      },
    };
  }
}
