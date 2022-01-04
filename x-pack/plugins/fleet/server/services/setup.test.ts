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
      const soRepo = savedObjectsRepositoryMock.create();
      soRepo.create = mockedMethodThrowsError();
      soRepo.find = mockedMethodThrowsError();
      soRepo.get = mockedMethodThrowsError();
      soRepo.update = mockedMethodThrowsError();
      const esClient = context.core.elasticsearch.client.asInternalUser;

      const setupPromise = setupFleet(soRepo, esClient);
      await expect(setupPromise).rejects.toThrow('SO method mocked to throw');
      await expect(setupPromise).rejects.toThrow(Error);
    });

    it('SO client throws other error', async () => {
      const soRepo = savedObjectsRepositoryMock.create();
      soRepo.create = mockedMethodThrowsCustom();
      soRepo.find = mockedMethodThrowsCustom();
      soRepo.get = mockedMethodThrowsCustom();
      soRepo.update = mockedMethodThrowsCustom();
      const esClient = context.core.elasticsearch.client.asInternalUser;

      const setupPromise = setupFleet(soRepo, esClient);
      await expect(setupPromise).rejects.toThrow('method mocked to throw');
      await expect(setupPromise).rejects.toThrow(CustomTestError);
    });
  });
});
