/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';

import { createAppContextStartContractMock, xpackMocks } from '../mocks';

import { ensurePreconfiguredPackagesAndPolicies } from '.';

import { appContextService } from './app_context';
import { getInstallations } from './epm/packages';
import { upgradeManagedPackagePolicies } from './managed_package_policies';
import { setupFleet } from './setup';

jest.mock('./preconfiguration');
jest.mock('./preconfiguration/outputs');
jest.mock('./settings');
jest.mock('./output');
jest.mock('./epm/packages');
jest.mock('./managed_package_policies');

const mockedMethodThrowsError = (mockFn: jest.Mock) =>
  mockFn.mockImplementation(() => {
    throw new Error('SO method mocked to throw');
  });

class CustomTestError extends Error {}
const mockedMethodThrowsCustom = (mockFn: jest.Mock) =>
  mockFn.mockImplementation(() => {
    throw new CustomTestError('method mocked to throw');
  });

describe('setupFleet', () => {
  let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: ElasticsearchClientMock;

  beforeEach(async () => {
    context = xpackMocks.createRequestHandlerContext();
    // prevents `Logger not set.` and other appContext errors
    appContextService.start(createAppContextStartContractMock());
    soClient = context.core.savedObjects.client;
    esClient = context.core.elasticsearch.client.asInternalUser;

    (getInstallations as jest.Mock).mockResolvedValueOnce({
      saved_objects: [],
    });

    (ensurePreconfiguredPackagesAndPolicies as jest.Mock).mockResolvedValue({
      nonFatalErrors: [],
    });

    (upgradeManagedPackagePolicies as jest.Mock).mockResolvedValue([]);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('should reject with any error thrown underneath', () => {
    it('SO client throws plain Error', async () => {
      mockedMethodThrowsError(upgradeManagedPackagePolicies as jest.Mock);

      const setupPromise = setupFleet(soClient, esClient);
      await expect(setupPromise).rejects.toThrow('SO method mocked to throw');
      await expect(setupPromise).rejects.toThrow(Error);
    });

    it('SO client throws other error', async () => {
      mockedMethodThrowsCustom(upgradeManagedPackagePolicies as jest.Mock);

      const setupPromise = setupFleet(soClient, esClient);
      await expect(setupPromise).rejects.toThrow('method mocked to throw');
      await expect(setupPromise).rejects.toThrow(CustomTestError);
    });
  });

  it('should not return non fatal errors when upgrade result has no errors', async () => {
    (upgradeManagedPackagePolicies as jest.Mock).mockResolvedValue([
      {
        errors: [],
        packagePolicyId: '1',
      },
    ]);

    const result = await setupFleet(soClient, esClient);

    expect(result).toEqual({
      isInitialized: true,
      nonFatalErrors: [],
    });
  });

  it('should return non fatal errors when upgrade result has errors', async () => {
    (upgradeManagedPackagePolicies as jest.Mock).mockResolvedValue([
      {
        errors: [{ key: 'key', message: 'message' }],
        packagePolicyId: '1',
      },
    ]);

    const result = await setupFleet(soClient, esClient);

    expect(result).toEqual({
      isInitialized: true,
      nonFatalErrors: [
        {
          errors: [
            {
              key: 'key',
              message: 'message',
            },
          ],
          packagePolicyId: '1',
        },
      ],
    });
  });
});
