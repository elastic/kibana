/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityGetUserProfileResponse } from '@elastic/elasticsearch/lib/api/types';

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { UserProfileServiceStart } from '@kbn/security-plugin-types-server';

import { UserProfileService } from './user_profile_service';
import { UserSettingService } from './user_setting_service';
import type { UserProfileWithSecurity } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import { userProfileMock } from '../../common/model/user_profile.mock';
import { authorizationMock } from '../authorization/index.mock';
import { sessionMock } from '../session_management/session.mock';

const logger = loggingSystemMock.createLogger();
describe('UserSettingService', () => {
  let mockStartParams: {
    clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
    session: ReturnType<typeof sessionMock.create>;
  };

  let mockAuthz: ReturnType<typeof authorizationMock.create>;
  let userProfileService: UserProfileService;
  let userSettingsService: UserSettingService;
  let userProfileServiceStart: UserProfileServiceStart;

  beforeEach(() => {
    mockStartParams = {
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      session: sessionMock.create(),
    };

    mockAuthz = authorizationMock.create();

    userProfileService = new UserProfileService(logger);
    userSettingsService = new UserSettingService(logger);

    userProfileService.setup({
      authz: mockAuthz,
      license: licenseMock.create({ allowUserProfileCollaboration: true }),
    });

    userProfileServiceStart = userProfileService.start(mockStartParams);
  });

  afterEach(() => {
    logger.error.mockClear();
  });

  it('should expose correct start contract', () => {
    const userSettingServiceStart = userSettingsService.start(userProfileServiceStart);
    expect(userSettingServiceStart).toMatchInlineSnapshot(`
      Object {
        "getCurrentUserProfileSettings": [Function],
      }
    `);
  });

  describe('#getCurrentUserProfileSettings', () => {
    let mockUserProfile: UserProfileWithSecurity;
    let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
    beforeEach(() => {
      mockRequest = httpServerMock.createKibanaRequest();
    });

    it('returns user settings data', async () => {
      mockUserProfile = userProfileMock.createWithSecurity({
        uid: 'UID',
        user: {
          username: 'user-1',
          full_name: 'full-name-1',
          realm_name: 'some-realm',
          realm_domain: 'some-domain',
          roles: ['role-1'],
        },
        data: {
          kibana: {
            userSettings: {
              darkMode: 'dark',
            },
          },
        },
      });

      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockResolvedValue({
        profiles: [mockUserProfile],
      } as unknown as SecurityGetUserProfileResponse);

      mockStartParams.session.get.mockResolvedValue({
        error: null,
        value: sessionMock.createValue({ userProfileId: mockUserProfile.uid }),
      });

      userProfileServiceStart = userProfileService.start(mockStartParams);
      const userSettingServiceStart = userSettingsService.start(userProfileServiceStart);
      await expect(
        userSettingServiceStart.getCurrentUserProfileSettings(mockRequest)
      ).resolves.toEqual({ darkMode: 'dark' });
    });

    it('logs a warning and returns ', async () => {
      mockUserProfile = userProfileMock.createWithSecurity({
        uid: 'UID',
        user: {
          username: 'user-1',
          full_name: 'full-name-1',
          realm_name: 'some-realm',
          realm_domain: 'some-domain',
          roles: ['role-1'],
        },
        data: {},
      });

      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockResolvedValue({
        profiles: [mockUserProfile],
      } as unknown as SecurityGetUserProfileResponse);

      mockStartParams.session.get.mockResolvedValue({
        error: null,
        value: sessionMock.createValue({ userProfileId: mockUserProfile.uid }),
      });

      userProfileServiceStart = userProfileService.start(mockStartParams);
      const userSettingServiceStart = userSettingsService.start(userProfileServiceStart);

      await expect(
        userSettingServiceStart.getCurrentUserProfileSettings(mockRequest)
      ).resolves.toEqual({});

      expect(logger.debug).toHaveBeenCalledWith('User Settings not found.');
    });
  });
});
