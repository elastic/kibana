/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';

import { userProfileMock } from '../../common/model/user_profile.mock';
import { securityMock } from '../mocks';
import { UserProfileService } from './user_profile_service';

const logger = loggingSystemMock.createLogger();
const userProfileService = new UserProfileService(logger);

describe('UserProfileService', () => {
  let mockStartParams: {
    clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  };

  beforeEach(() => {
    mockStartParams = {
      clusterClient: elasticsearchServiceMock.createClusterClient(),
    };

    const userProfile = userProfileMock.create({
      uid: 'UID',
      data: {
        kibana: {
          avatar: 'fun.gif',
        },
        other_app: {
          secret: 'data',
        },
      },
    });
    mockStartParams.clusterClient.asInternalUser.transport.request.mockResolvedValue({
      [userProfile.uid]: userProfile,
    });
  });

  afterEach(() => {
    logger.error.mockClear();
  });

  it('should expose correct start contract', () => {
    const startContract = userProfileService.start(mockStartParams);
    expect(startContract).toMatchInlineSnapshot(`
      Object {
        "activate": [Function],
        "get": [Function],
        "update": [Function],
      }
    `);
  });

  describe('#get', () => {
    it('should get user profile', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.get('UID')).resolves.toMatchInlineSnapshot(`
          Object {
            "data": Object {
              "avatar": "fun.gif",
            },
            "enabled": true,
            "uid": "UID",
            "user": Object {
              "active": true,
              "enabled": true,
              "roles": Array [],
              "username": "some-username",
            },
          }
      `);
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '_security/profile/UID',
      });
    });

    it('should handle errors when get user profile fails', async () => {
      mockStartParams.clusterClient.asInternalUser.transport.request.mockRejectedValue(
        new Error('Fail')
      );
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.get('UID')).rejects.toMatchInlineSnapshot(`[Error: Fail]`);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should get user profile and application data scoped to Kibana', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.get('UID', '*')).resolves.toMatchInlineSnapshot(`
          Object {
            "data": Object {
              "avatar": "fun.gif",
            },
            "enabled": true,
            "uid": "UID",
            "user": Object {
              "active": true,
              "enabled": true,
              "roles": Array [],
              "username": "some-username",
            },
          }
      `);
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '_security/profile/UID?data=kibana.*',
      });
    });
  });

  describe('#update', () => {
    it('should update application data scoped to Kibana', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await startContract.update('UID', {
        avatar: 'boring.png',
      });
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        body: {
          data: {
            kibana: {
              avatar: 'boring.png',
            },
          },
        },
        method: 'POST',
        path: '_security/profile/UID/_data',
      });
    });

    it('should handle errors when update user profile fails', async () => {
      mockStartParams.clusterClient.asInternalUser.transport.request.mockRejectedValue(
        new Error('Fail')
      );
      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.update('UID', {
          avatar: 'boring.png',
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Fail]`);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('#activate', () => {
    beforeEach(() => {
      mockStartParams.clusterClient.asInternalUser.transport.request.mockResolvedValue(
        userProfileMock.create()
      );
    });

    it('should activate user profile with password grant', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.activate({
          type: 'password',
          username: 'some-username',
          password: 'password',
        })
      ).resolves.toMatchInlineSnapshot(`
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "some-profile-uid",
          "user": Object {
            "active": true,
            "enabled": true,
            "roles": Array [],
            "username": "some-username",
          },
        }
      `);
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledTimes(
        1
      );
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '_security/profile/_activate',
        body: { grant_type: 'password', password: 'password', username: 'some-username' },
      });
    });

    it('should activate user profile with access token grant', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.activate({ type: 'accessToken', accessToken: 'some-token' }))
        .resolves.toMatchInlineSnapshot(`
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "some-profile-uid",
          "user": Object {
            "active": true,
            "enabled": true,
            "roles": Array [],
            "username": "some-username",
          },
        }
      `);
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledTimes(
        1
      );
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '_security/profile/_activate',
        body: { grant_type: 'access_token', access_token: 'some-token' },
      });
    });

    it('fails if activation fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 409, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.transport.request.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.activate({ type: 'accessToken', accessToken: 'some-token' })
      ).rejects.toBe(failureReason);
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledTimes(
        1
      );
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '_security/profile/_activate',
        body: { grant_type: 'access_token', access_token: 'some-token' },
      });
    });
  });
});
