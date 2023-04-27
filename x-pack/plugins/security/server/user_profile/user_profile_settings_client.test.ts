/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { httpServerMock } from '@kbn/core-http-server-mocks';

import { UserProfileSettingsClient } from './user_profile_settings_client';
import type { UserSettingServiceStart } from './user_setting_service';

describe('UserProfileSettingsClient', () => {
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let client: UserProfileSettingsClient;

  beforeEach(() => {
    const userSettingsServiceStart = {
      getCurrentUserProfileSettings: jest.fn(),
    } as jest.Mocked<UserSettingServiceStart>;

    userSettingsServiceStart.getCurrentUserProfileSettings.mockResolvedValue({ darkMode: 'dark' });

    client = new UserProfileSettingsClient(userSettingsServiceStart);
  });

  describe('#get', () => {
    it('should return user settings', async () => {
      const userSettings = await client.get(mockRequest);
      expect(userSettings).toEqual({ darkMode: 'dark' });
    });
  });
});
