/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  SecurityActivateUserProfileResponse,
  SecurityGetUserProfileResponse,
  SecuritySuggestUserProfilesResponse,
} from '@elastic/elasticsearch/lib/api/types';

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import { userProfileMock } from '../../common/model/user_profile.mock';
import { authorizationMock } from '../authorization/index.mock';
import { securityMock } from '../mocks';
import { UserProfileService } from './user_profile_service';

const logger = loggingSystemMock.createLogger();
const userProfileService = new UserProfileService(logger);

describe('UserProfileService', () => {
  let mockStartParams: {
    clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  };
  let mockAuthz: ReturnType<typeof authorizationMock.create>;
  beforeEach(() => {
    mockStartParams = {
      clusterClient: elasticsearchServiceMock.createClusterClient(),
    };
    mockAuthz = authorizationMock.create();

    userProfileService.setup({ authz: mockAuthz });
  });

  afterEach(() => {
    logger.error.mockClear();
  });

  it('should expose correct start contract', () => {
    const startContract = userProfileService.start(mockStartParams);
    expect(startContract).toMatchInlineSnapshot(`
      Object {
        "activate": [Function],
        "bulkGet": [Function],
        "get": [Function],
        "suggest": [Function],
        "update": [Function],
      }
    `);
  });

  describe('#get', () => {
    beforeEach(() => {
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

      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockResolvedValue({
        [userProfile.uid]: userProfile,
      } as unknown as SecurityGetUserProfileResponse);
    });

    it('should get user profile', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.get('UID')).resolves.toMatchInlineSnapshot(`
                        Object {
                          "data": Object {
                            "avatar": "fun.gif",
                          },
                          "enabled": true,
                          "labels": Object {},
                          "uid": "UID",
                          "user": Object {
                            "display_name": undefined,
                            "email": "some@email",
                            "full_name": undefined,
                            "realm_domain": undefined,
                            "realm_name": "some-realm",
                            "roles": Array [],
                            "username": "some-username",
                          },
                        }
                  `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: 'UID',
      });
    });

    it('should handle errors when get user profile fails', async () => {
      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockRejectedValue(
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
                        "labels": Object {},
                        "uid": "UID",
                        "user": Object {
                          "display_name": undefined,
                          "email": "some@email",
                          "full_name": undefined,
                          "realm_domain": undefined,
                          "realm_name": "some-realm",
                          "roles": Array [],
                          "username": "some-username",
                        },
                      }
                  `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: 'UID',
        data: 'kibana.*',
      });
    });
  });

  describe('#update', () => {
    it('should update application data scoped to Kibana', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await startContract.update('UID', {
        avatar: 'boring.png',
      });
      expect(
        mockStartParams.clusterClient.asInternalUser.security.updateUserProfileData
      ).toHaveBeenCalledWith({
        uid: 'UID',
        data: {
          kibana: {
            avatar: 'boring.png',
          },
        },
      });
    });

    it('should handle errors when update user profile fails', async () => {
      mockStartParams.clusterClient.asInternalUser.security.updateUserProfileData.mockRejectedValue(
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
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile.mockResolvedValue(
        userProfileMock.create() as unknown as SecurityActivateUserProfileResponse
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
                        "labels": Object {},
                        "uid": "some-profile-uid",
                        "user": Object {
                          "display_name": undefined,
                          "email": "some@email",
                          "full_name": undefined,
                          "realm_domain": undefined,
                          "realm_name": "some-realm",
                          "roles": Array [],
                          "username": "some-username",
                        },
                      }
                  `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({
        grant_type: 'password',
        password: 'password',
        username: 'some-username',
      });
    });

    it('should activate user profile with access token grant', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.activate({ type: 'accessToken', accessToken: 'some-token' }))
        .resolves.toMatchInlineSnapshot(`
                        Object {
                          "data": Object {},
                          "enabled": true,
                          "labels": Object {},
                          "uid": "some-profile-uid",
                          "user": Object {
                            "display_name": undefined,
                            "email": "some@email",
                            "full_name": undefined,
                            "realm_domain": undefined,
                            "realm_name": "some-realm",
                            "roles": Array [],
                            "username": "some-username",
                          },
                        }
                    `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });

    it('fails if activation fails with non-409 error', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.activate({ type: 'accessToken', accessToken: 'some-token' })
      ).rejects.toBe(failureReason);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });

    it('retries activation if initially fails with 409 error', async () => {
      jest.useFakeTimers();

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 409, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
        .mockRejectedValueOnce(failureReason)
        .mockResolvedValueOnce(
          userProfileMock.create() as unknown as SecurityActivateUserProfileResponse
        );

      const startContract = userProfileService.start(mockStartParams);
      const activatePromise = startContract.activate({
        type: 'accessToken',
        accessToken: 'some-token',
      });
      await nextTick();
      jest.runAllTimers();

      await expect(activatePromise).resolves.toMatchInlineSnapshot(`
                      Object {
                        "data": Object {},
                        "enabled": true,
                        "labels": Object {},
                        "uid": "some-profile-uid",
                        "user": Object {
                          "display_name": undefined,
                          "email": "some@email",
                          "full_name": undefined,
                          "realm_domain": undefined,
                          "realm_name": "some-realm",
                          "roles": Array [],
                          "username": "some-username",
                        },
                      }
                  `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(2);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });

    it('fails if activation max retries exceeded', async () => {
      jest.useFakeTimers();

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 409, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);

      // Initial activation attempt.
      const activatePromise = startContract.activate({
        type: 'accessToken',
        accessToken: 'some-token',
      });
      await nextTick();
      jest.runAllTimers();

      // The first retry.
      await nextTick();
      jest.runAllTimers();

      // The second retry.
      await nextTick();
      jest.runAllTimers();

      await expect(activatePromise).rejects.toBe(failureReason);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(3);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });
  });

  describe('#bulkGet', () => {
    it('properly parses returned profiles', async () => {
      mockStartParams.clusterClient.asInternalUser.transport.request.mockResolvedValue({
        profiles: [
          userProfileMock.create({
            uid: 'UID-1',
            user: {
              username: 'user-1',
              display_name: 'display-name-1',
              full_name: 'full-name-1',
              realm_name: 'some-realm',
              realm_domain: 'some-domain',
              roles: ['role-1'],
              authentication_provider: { name: 'basic', type: 'basic' },
            },
          }),
          userProfileMock.create({
            uid: 'UID-2',
            user: {
              username: 'user-2',
              display_name: 'display-name-2',
              full_name: 'full-name-2',
              realm_name: 'some-realm',
              realm_domain: 'some-domain',
              roles: ['role-2'],
              authentication_provider: { name: 'basic', type: 'basic' },
            },
          }),
        ],
      });

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.bulkGet({ uids: new Set(['UID-1', 'UID-2']) })).resolves
        .toMatchInlineSnapshot(`
                        Array [
                          Object {
                            "data": Object {},
                            "enabled": true,
                            "uid": "UID-1",
                            "user": Object {
                              "display_name": "display-name-1",
                              "email": undefined,
                              "full_name": "full-name-1",
                              "username": "user-1",
                            },
                          },
                          Object {
                            "data": Object {},
                            "enabled": true,
                            "uid": "UID-2",
                            "user": Object {
                              "display_name": "display-name-2",
                              "email": undefined,
                              "full_name": "full-name-2",
                              "username": "user-2",
                            },
                          },
                        ]
                    `);
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledTimes(
        1
      );
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '_security/profile/_suggest',
        body: { hint: { uids: ['UID-1', 'UID-2'] }, size: 2 },
      });
    });

    it('filters out not requested profiles', async () => {
      mockStartParams.clusterClient.asInternalUser.transport.request.mockResolvedValue({
        profiles: [
          userProfileMock.create({ uid: 'UID-1' }),
          userProfileMock.create({ uid: 'UID-2' }),
          userProfileMock.create({ uid: 'UID-NOT-REQUESTED' }),
        ],
      });

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.bulkGet({ uids: new Set(['UID-1', 'UID-2', 'UID-3']) })).resolves
        .toMatchInlineSnapshot(`
                        Array [
                          Object {
                            "data": Object {},
                            "enabled": true,
                            "uid": "UID-1",
                            "user": Object {
                              "display_name": undefined,
                              "email": "some@email",
                              "full_name": undefined,
                              "username": "some-username",
                            },
                          },
                          Object {
                            "data": Object {},
                            "enabled": true,
                            "uid": "UID-2",
                            "user": Object {
                              "display_name": undefined,
                              "email": "some@email",
                              "full_name": undefined,
                              "username": "some-username",
                            },
                          },
                        ]
                    `);
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledTimes(
        1
      );
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '_security/profile/_suggest',
        body: { hint: { uids: ['UID-1', 'UID-2', 'UID-3'] }, size: 3 },
      });
    });

    it('should request data if data path is specified', async () => {
      mockStartParams.clusterClient.asInternalUser.transport.request.mockResolvedValue({
        profiles: [
          userProfileMock.create({
            uid: 'UID-1',
            data: { some: 'data', kibana: { some: 'kibana-data' } },
          }),
        ],
      });

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.bulkGet({ uids: new Set(['UID-1']), dataPath: '*' })).resolves
        .toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data",
                  },
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "display_name": undefined,
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledTimes(
        1
      );
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '_security/profile/_suggest',
        body: {
          hint: { uids: ['UID-1'] },
          data: 'kibana.*',
          size: 1,
        },
      });
    });

    it('fails if Elasticsearch returns error', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.transport.request.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.bulkGet({ uids: new Set(['UID-1', 'UID-2']) })).rejects.toBe(
        failureReason
      );
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledTimes(
        1
      );
      expect(mockStartParams.clusterClient.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '_security/profile/_suggest',
        body: { hint: { uids: ['UID-1', 'UID-2'] }, size: 2 },
      });
    });
  });

  describe('#suggest', () => {
    it('properly parses returned profiles without privileges check', async () => {
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: [
          userProfileMock.create({
            uid: 'UID-1',
            user: {
              username: 'user-1',
              display_name: 'display-name-1',
              full_name: 'full-name-1',
              realm_name: 'some-realm',
              realm_domain: 'some-domain',
              roles: ['role-1'],
              authentication_provider: { name: 'basic', type: 'basic' },
            },
          }),
          userProfileMock.create({
            uid: 'UID-2',
            user: {
              username: 'user-2',
              display_name: 'display-name-2',
              full_name: 'full-name-2',
              realm_name: 'some-realm',
              realm_domain: 'some-domain',
              roles: ['role-2'],
              authentication_provider: { name: 'basic', type: 'basic' },
            },
          }),
        ],
      } as unknown as SecuritySuggestUserProfilesResponse);

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ size: 50, name: 'some' })).resolves
        .toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {},
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "display_name": "display-name-1",
                    "email": undefined,
                    "full_name": "full-name-1",
                    "username": "user-1",
                  },
                },
                Object {
                  "data": Object {},
                  "enabled": true,
                  "uid": "UID-2",
                  "user": Object {
                    "display_name": "display-name-2",
                    "email": undefined,
                    "full_name": "full-name-2",
                    "username": "user-2",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 50,
      });
      expect(mockAuthz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    });

    it('should request data if data path is specified', async () => {
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: [
          userProfileMock.create({
            uid: 'UID-1',
            data: { some: 'data', kibana: { some: 'kibana-data' } },
          }),
        ],
      } as unknown as SecuritySuggestUserProfilesResponse);

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ name: 'some', dataPath: '*' })).resolves
        .toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data",
                  },
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "display_name": undefined,
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 10,
        data: 'kibana.*',
      });
      expect(mockAuthz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    });

    it('fails if requested too many suggestions', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ name: 'som', size: 101 })).rejects.toMatchInlineSnapshot(
        `[Error: Can return up to 100 suggestions, but 101 suggestions were requested.]`
      );
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).not.toHaveBeenCalled();
      expect(mockAuthz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    });

    it('fails if Elasticsearch suggest API returns error', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ name: 'some' })).rejects.toBe(failureReason);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 10,
      });
    });

    it('properly handles privileges checks when privileges can be checked in one go', async () => {
      // In this test we'd like to simulate the following case:
      // 1. User requests 3 results with privileges check
      // 2. Kibana will fetch 10 (min batch) results
      // 3. Only UID-0, UID-1 and UID-8 profiles will have necessary privileges
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: Array.from({ length: 10 }).map((_, index) =>
          userProfileMock.create({
            uid: `UID-${index}`,
            data: { some: 'data', kibana: { some: `kibana-data-${index}` } },
          })
        ),
      } as unknown as SecuritySuggestUserProfilesResponse);

      const mockAtSpacePrivilegeCheck = { atSpace: jest.fn() };
      mockAtSpacePrivilegeCheck.atSpace.mockResolvedValue({
        hasPrivilegeUids: ['UID-0', 'UID-1', 'UID-8'],
        errorUids: [],
      });
      mockAuthz.checkUserProfilesPrivileges.mockReturnValue(mockAtSpacePrivilegeCheck);

      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.suggest({
          name: 'some',
          size: 3,
          dataPath: '*',
          requiredPrivileges: {
            spaceId: 'some-space',
            privileges: { kibana: ['privilege-1', 'privilege-2'] },
          },
        })
      ).resolves.toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data-0",
                  },
                  "enabled": true,
                  "uid": "UID-0",
                  "user": Object {
                    "display_name": undefined,
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
                Object {
                  "data": Object {
                    "some": "kibana-data-1",
                  },
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "display_name": undefined,
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
                Object {
                  "data": Object {
                    "some": "kibana-data-8",
                  },
                  "enabled": true,
                  "uid": "UID-8",
                  "user": Object {
                    "display_name": undefined,
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 10,
        data: 'kibana.*',
      });

      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledTimes(1);
      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledWith(
        new Set(Array.from({ length: 10 }).map((_, index) => `UID-${index}`))
      );

      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledTimes(1);
      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledWith('some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });
    });

    it('properly handles privileges checks when privileges have to be checked in multiple steps', async () => {
      // In this test we'd like to simulate the following case:
      // 1. User requests 11 results with privileges check
      // 2. Kibana will fetch 22 (two times more than requested) results
      // 3. Only UID-0 and UID-21 profiles will have necessary privileges
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: Array.from({ length: 22 }).map((_, index) =>
          userProfileMock.create({
            uid: `UID-${index}`,
            data: { some: 'data', kibana: { some: `kibana-data-${index}` } },
          })
        ),
      } as unknown as SecuritySuggestUserProfilesResponse);

      const mockAtSpacePrivilegeCheck = { atSpace: jest.fn() };
      mockAtSpacePrivilegeCheck.atSpace
        .mockResolvedValueOnce({
          hasPrivilegeUids: ['UID-0'],
          errorUids: [],
        })
        .mockResolvedValueOnce({
          hasPrivilegeUids: ['UID-20'],
          errorUids: [],
        })
        .mockResolvedValueOnce({
          hasPrivilegeUids: [],
          errorUids: [],
        });
      mockAuthz.checkUserProfilesPrivileges.mockReturnValue(mockAtSpacePrivilegeCheck);

      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.suggest({
          name: 'some',
          size: 11,
          dataPath: '*',
          requiredPrivileges: {
            spaceId: 'some-space',
            privileges: { kibana: ['privilege-1', 'privilege-2'] },
          },
        })
      ).resolves.toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data-0",
                  },
                  "enabled": true,
                  "uid": "UID-0",
                  "user": Object {
                    "display_name": undefined,
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
                Object {
                  "data": Object {
                    "some": "kibana-data-20",
                  },
                  "enabled": true,
                  "uid": "UID-20",
                  "user": Object {
                    "display_name": undefined,
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 22,
        data: 'kibana.*',
      });

      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledTimes(3);
      // UID-0 -- UID-10 (11 UIDs - number of requested profiles)
      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenNthCalledWith(
        1,
        new Set(Array.from({ length: 11 }).map((_, index) => `UID-${index}`))
      );
      // UID-11 -- UID-20 (10 UIDs - min batch size)
      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenNthCalledWith(
        2,
        new Set(
          Array.from({ length: 21 })
            .map((_, index) => `UID-${index}`)
            .slice(-10)
        )
      );
      // UID-21 - remaining profile id
      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenNthCalledWith(3, new Set(['UID-21']));

      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledTimes(3);
      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenNthCalledWith(1, 'some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });
      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenNthCalledWith(2, 'some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });
      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenNthCalledWith(3, 'some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });
    });
  });
});
