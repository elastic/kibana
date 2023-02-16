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

/**
 * Used to set the provider that contains the factory that creates UserProfileClients
 *
 * @param userSettingsServiceStart A service that provides functions to get the current user's profile, that will be
 * exposed by the {@link UserProfilesClient}
 * @param uiSettingServiceStart The service that will the input provider to create instances of {@link UserProfilesClient}
 */
export function setupUserProfilesClientOnUiSettingsServiceStart({
  userSettingsServiceStart,
  uiSettingServiceStart,
}: SetupUiSettingsServiceParams) {
  uiSettingServiceStart.setUserProfilesClientFactoryProvider(() => () => {
    return new UserProfilesClient(userSettingsServiceStart);
  });
}
