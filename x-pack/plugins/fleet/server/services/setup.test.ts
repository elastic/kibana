/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from 'src/core/server/mocks';

import { createAppContextStartContractMock, xpackMocks } from '../mocks';

import { appContextService } from './app_context';
import { setupFleet } from './setup';

const mockedMethodThrowsError = () =>
  jest.fn().mockImplementation(() => {
    throw new Error('SO method mocked to throw');
  });

class CustomTestError extends Error {}
const mockedMethodThrowsCustom = () =>
  jest.fn().mockImplementation(() => {
    throw new CustomTestError('method mocked to throw');
  });

describe('setupFleet', () => {
  let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;

  beforeEach(async () => {
    context = xpackMocks.createRequestHandlerContext();
    // prevents `Logger not set.` and other appContext errors
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('should reject with any error thrown underneath', () => {
    it('SO client throws plain Error', async () => {
      const soClient = savedObjectsRepositoryMock.create();
      soClient.create = mockedMethodThrowsError();
      soClient.find = mockedMethodThrowsError();
      soClient.get = mockedMethodThrowsError();
      soClient.update = mockedMethodThrowsError();
      const esClient = context.core.elasticsearch.client.asInternalUser;

      const setupPromise = setupFleet(soClient, esClient);
      await expect(setupPromise).rejects.toThrow('SO method mocked to throw');
      await expect(setupPromise).rejects.toThrow(Error);
    });

    it('SO client throws other error', async () => {
      const soClient = savedObjectsRepositoryMock.create();
      soClient.create = mockedMethodThrowsCustom();
      soClient.find = mockedMethodThrowsCustom();
      soClient.get = mockedMethodThrowsCustom();
      soClient.update = mockedMethodThrowsCustom();
      const esClient = context.core.elasticsearch.client.asInternalUser;

      const setupPromise = setupFleet(soClient, esClient);
      await expect(setupPromise).rejects.toThrow('method mocked to throw');
      await expect(setupPromise).rejects.toThrow(CustomTestError);
    });
  });
});
