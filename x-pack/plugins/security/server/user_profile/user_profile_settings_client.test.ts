/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Logger } from '@kbn/logging';

import { UserProfileSettingsClient } from './user_profile_settings_client';
import type { UserSettingServiceStart } from './user_setting_service';

describe('UserProfileSettingsClient', () => {
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let client: UserProfileSettingsClient;
  let logger: Logger;
  let userSettingServiceStart: jest.Mocked<UserSettingServiceStart>;

  beforeEach(() => {
    userSettingServiceStart = {
      getCurrentUserProfileSettings: jest.fn(),
    };

    userSettingServiceStart.getCurrentUserProfileSettings.mockResolvedValue({ darkMode: 'dark' });

    logger = loggingSystemMock.createLogger();
    client = new UserProfileSettingsClient(logger);
  });

  describe('#get', () => {
    it('should return empty before UserSettingServiceStart is set', async () => {
      const userSettings = await client.get(mockRequest);
      expect(userSettings).toEqual({});
      expect(logger.debug).toHaveBeenCalledWith('UserSettingsServiceStart has not been set yet');
    });

    it('should return user settings after UserSettingServiceStart is set', async () => {
      client.setUserSettingsServiceStart(userSettingServiceStart);
      const userSettings = await client.get(mockRequest);

      expect(userSettings).toEqual({ darkMode: 'dark' });
    });
  });
});
