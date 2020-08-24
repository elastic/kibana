/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackMocks } from '../../../../../x-pack/mocks';
import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from './app_context';
import { setupIngestManager } from './setup';

const mockedMethodThrowsError = () =>
  jest.fn().mockImplementation(() => {
    throw new Error('SO method mocked to throw');
  });

class CustomTestError extends Error {}
const mockedMethodThrowsCustom = () =>
  jest.fn().mockImplementation(() => {
    throw new CustomTestError('method mocked to throw');
  });

describe('setupIngestManager', () => {
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
      const soClient = context.core.savedObjects.client;
      soClient.create = mockedMethodThrowsError();
      soClient.find = mockedMethodThrowsError();
      soClient.get = mockedMethodThrowsError();
      soClient.update = mockedMethodThrowsError();

      const setupPromise = setupIngestManager(soClient, jest.fn());
      await expect(setupPromise).rejects.toThrow('SO method mocked to throw');
      await expect(setupPromise).rejects.toThrow(Error);
    });

    it('SO client throws other error', async () => {
      const soClient = context.core.savedObjects.client;
      soClient.create = mockedMethodThrowsCustom();
      soClient.find = mockedMethodThrowsCustom();
      soClient.get = mockedMethodThrowsCustom();
      soClient.update = mockedMethodThrowsCustom();

      const setupPromise = setupIngestManager(soClient, jest.fn());
      await expect(setupPromise).rejects.toThrow('method mocked to throw');
      await expect(setupPromise).rejects.toThrow(CustomTestError);
    });
  });
});
