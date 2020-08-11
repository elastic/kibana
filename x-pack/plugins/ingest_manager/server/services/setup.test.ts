/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackMocks } from '../../../../../x-pack/mocks';
import { RegistryError } from '../errors';
import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from './app_context';
import { setupIngestManager } from './setup';

const mockedMethodThrowsCustom = () =>
  jest.fn().mockImplementation(() => {
    throw new Error('SO method mocked to throw');
  });

const mockedMethodThrowsRegistry = () =>
  jest.fn().mockImplementation(() => {
    throw new RegistryError('Registry method mocked to throw');
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
    it('with plain Error', async () => {
      const soClient = context.core.savedObjects.client;
      soClient.create = mockedMethodThrowsCustom();
      soClient.find = mockedMethodThrowsCustom();
      soClient.get = mockedMethodThrowsCustom();
      soClient.update = mockedMethodThrowsCustom();

      const setupPromise = setupIngestManager(soClient, jest.fn());
      await expect(setupPromise).rejects.toThrow('SO method mocked to throw');
      await expect(setupPromise).rejects.toThrow(Error);
    });

    it('with RegistryError', async () => {
      const soClient = context.core.savedObjects.client;
      soClient.create = mockedMethodThrowsRegistry();
      soClient.find = mockedMethodThrowsRegistry();
      soClient.get = mockedMethodThrowsRegistry();
      soClient.update = mockedMethodThrowsRegistry();

      const setupPromise = setupIngestManager(soClient, jest.fn());
      await expect(setupPromise).rejects.toThrow('Registry method mocked to throw');
      await expect(setupPromise).rejects.toThrow(RegistryError);
    });
  });

  // describe('caching setup result', () => {
  //   it('should not cache failures', async () => {});
  //   it('should cache successes', async () => {});
  // });
});
