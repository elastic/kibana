/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileData, UserProfileLabels, UserProfileWithSecurity } from '../../common';
import type { UserProfileGetCurrentParams, UserProfileServiceStart } from './user_profile_service';

export interface UserSettingServiceStart {
  getCurrent<D extends UserProfileData, L extends UserProfileLabels>(
    params: UserProfileGetCurrentParams
  ): Promise<UserProfileWithSecurity<D, L> | null>;
}

export class UserSettingService {
  constructor() {}

  start(userProfileServiceStart: UserProfileServiceStart): UserSettingServiceStart {
    console.log('Inside user_settings_service.ts in Security Plugin');
    return {
      getCurrent: (params) => userProfileServiceStart.getCurrent(params),
    };
  }
}
