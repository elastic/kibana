/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CasesClientFactory } from './factory';
import { createCasesClientFactoryMockArgs } from './mocks';
import { createCasesClient } from './client';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';

jest.mock('./client');

describe('CasesClientFactory', () => {
  const coreStart = coreMock.createStart();
  const request = httpServerMock.createKibanaRequest();

  const rawRequest: FakeRawRequest = {
    headers: {},
    path: '/',
  };

  const fakeRequest = CoreKibanaRequest.from(rawRequest);
  const createCasesClientMocked = createCasesClient as jest.Mock;
  const logger = loggingSystemMock.createLogger();
  const args = createCasesClientFactoryMockArgs();
  let casesClientFactory: CasesClientFactory;

  args.featuresPluginStart.getKibanaFeatures.mockReturnValue([]);

  beforeEach(() => {
    casesClientFactory = new CasesClientFactory(logger);
    casesClientFactory.initialize(args);
    jest.clearAllMocks();
  });

  describe('user info', () => {
    it('constructs the user info from user profiles', async () => {
      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
      args.securityPluginStart.userProfiles.getCurrent.mockResolvedValueOnce({
        // @ts-expect-error: not all fields are needed
        user: { username: 'my_user', full_name: 'My user', email: 'elastic@elastic.co' },
      });

      await casesClientFactory.create({
        request,
        savedObjectsService: coreStart.savedObjects,
        scopedClusterClient,
      });

      expect(args.securityPluginStart.userProfiles.getCurrent).toHaveBeenCalled();
      expect(args.securityServiceStart.authc.getCurrentUser).not.toHaveBeenCalled();
      expect(createCasesClientMocked.mock.calls[0][0].user).toEqual({
        username: 'my_user',
        full_name: 'My user',
        email: 'elastic@elastic.co',
      });
    });

    it('constructs the user info from the authc service if the user profile is not available', async () => {
      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
      // @ts-expect-error: not all fields are needed
      args.securityServiceStart.authc.getCurrentUser.mockReturnValueOnce({
        username: 'my_user_2',
        full_name: 'My user 2',
        email: 'elastic2@elastic.co',
      });

      await casesClientFactory.create({
        request,
        savedObjectsService: coreStart.savedObjects,
        scopedClusterClient,
      });

      expect(args.securityPluginStart.userProfiles.getCurrent).toHaveBeenCalled();
      expect(args.securityServiceStart.authc.getCurrentUser).toHaveBeenCalled();
      expect(createCasesClientMocked.mock.calls[0][0].user).toEqual({
        username: 'my_user_2',
        full_name: 'My user 2',
        email: 'elastic2@elastic.co',
      });
    });

    it('constructs the user info from fake requests correctly', async () => {
      const scopedClusterClient =
        coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;

      await casesClientFactory.create({
        request: fakeRequest,
        savedObjectsService: coreStart.savedObjects,
        scopedClusterClient,
      });

      expect(args.securityPluginStart.userProfiles.getCurrent).toHaveBeenCalled();
      expect(args.securityServiceStart.authc.getCurrentUser).toHaveBeenCalled();
      expect(createCasesClientMocked.mock.calls[0][0].user).toEqual({
        username: 'elastic/kibana',
        full_name: null,
        email: null,
      });
    });

    it('return null for all user fields if it cannot find the user info', async () => {
      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

      await casesClientFactory.create({
        request,
        savedObjectsService: coreStart.savedObjects,
        scopedClusterClient,
      });

      expect(args.securityPluginStart.userProfiles.getCurrent).toHaveBeenCalled();
      expect(args.securityServiceStart.authc.getCurrentUser).toHaveBeenCalled();
      expect(createCasesClientMocked.mock.calls[0][0].user).toEqual({
        username: null,
        full_name: null,
        email: null,
      });
    });
  });
});
