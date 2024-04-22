/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CasesClientFactory } from './factory';
import { createCasesClientFactoryMockArgs } from './mocks';
import { createCasesClient } from './client';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';

jest.mock('./client');

describe('CasesClientFactory', () => {
  const coreStart = coreMock.createStart();

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
    it('constructs the user info from fake requests correctly', async () => {
      const scopedClusterClient =
        coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;

      await casesClientFactory.create({
        request: fakeRequest,
        savedObjectsService: coreStart.savedObjects,
        scopedClusterClient,
      });

      expect(args.securityPluginStart.userProfiles.getCurrent).toHaveBeenCalled();
      expect(args.securityPluginStart.authc.getCurrentUser).toHaveBeenCalled();
      expect(createCasesClientMocked.mock.calls[0][0].user).toEqual({
        username: 'elastic/kibana',
        full_name: null,
        email: null,
      });
    });
  });
});
