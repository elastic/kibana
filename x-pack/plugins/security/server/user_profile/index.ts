/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UserProfilesClient } from '@kbn/core-ui-settings-server-internal/src/clients/user_profiles_client';
import type { CoreStart } from '@kbn/core/server';

import type { UserSettingServiceStart } from './user_setting_service';

export { UserProfileService } from './user_profile_service';
export type {
  UserProfileServiceStart,
  UserProfileServiceStartInternal,
  UserProfileServiceStartParams,
  UserProfileSuggestParams,
  UserProfileBulkGetParams,
  UserProfileRequiredPrivileges,
  UserProfileGetCurrentParams,
} from './user_profile_service';
export type { UserProfileGrant } from './user_profile_grant';

interface SetupUiSettingsServiceParams {
  uiSettingServiceStart: CoreStart['uiSettings'];
  userSettingsServiceStart: UserSettingServiceStart;
}

export function setupUserProfilesClientOnUiSettingsServiceStart({
  userSettingsServiceStart,
  uiSettingServiceStart,
}: SetupUiSettingsServiceParams) {
  // TODO oof... there has to be a differnt way
  console.log('Inside User Profile plugin.ts:');
  console.log(uiSettingServiceStart);
  uiSettingServiceStart.setUserProfilesClientFactoryProvider(() => () => {
    return new UserProfilesClient(userSettingsServiceStart);
  });
}
