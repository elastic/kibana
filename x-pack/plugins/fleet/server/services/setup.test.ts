/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { MockedLogger } from '@kbn/logging-mocks';

import { createAppContextStartContractMock, xpackMocks } from '../mocks';

import { ensurePreconfiguredPackagesAndPolicies } from '.';

import { appContextService } from './app_context';
import { getInstallations } from './epm/packages';
import { upgradeManagedPackagePolicies } from './managed_package_policies';
import { ensureFleetManagedDataViews, setupFleet } from './setup';
import { getFleetManagedDataViewDefinitions } from './epm/kibana/index_pattern/install';

jest.mock('./preconfiguration');
jest.mock('./preconfiguration/outputs');
jest.mock('./preconfiguration/fleet_proxies');
jest.mock('./settings');
jest.mock('./output');
jest.mock('./download_source');
jest.mock('./epm/packages');
jest.mock('./managed_package_policies');
jest.mock('./setup/upgrade_package_install_version');
jest.mock('./epm/kibana/index_pattern/install');

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

    (getFleetManagedDataViewDefinitions as jest.Mock).mockReturnValueOnce([]);

    soClient.find.mockResolvedValue({ saved_objects: [] } as any);
    soClient.bulkGet.mockResolvedValue({ saved_objects: [] } as any);
  });

  afterEach(async () => {
    jest.resetAllMocks();
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

    soClient.get.mockImplementation((type, id) => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    });

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

    soClient.get.mockImplementation((type, id) => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    });

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

describe('ensureFleetManagedDataViews', () => {
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockLogger: MockedLogger;

  beforeEach(() => {
    mockSavedObjectsClient = savedObjectsClientMock.create();
    mockLogger = loggingSystemMock.createLogger();
  });

  it('creates data views when they do not exist', async () => {
    mockSavedObjectsClient.get.mockImplementation((type, id) => {
      return Promise.reject(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id));
    });

    (getFleetManagedDataViewDefinitions as jest.Mock).mockReturnValueOnce([
      {
        id: 'logs-*',
        type: 'index-pattern',
        typeMigrationVersion: '8.0.0',
        attributes: {
          title: 'logs-*',
          name: 'logs-*',
          timeFieldName: '@timestamp',
          allowNoIndex: true,
        },
      },
      {
        id: 'metrics-*',
        type: 'index-pattern',
        typeMigrationVersion: '8.0.0',
        attributes: {
          title: 'metrics-*',
          name: 'metrics-*',
          timeFieldName: '@timestamp',
          allowNoIndex: true,
        },
      },
    ]);

    await ensureFleetManagedDataViews({
      savedObjectsClient: mockSavedObjectsClient,
      logger: mockLogger,
    });

    expect(mockSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
      {
        id: 'logs-*',
        type: 'index-pattern',
        typeMigrationVersion: '8.0.0',
        attributes: {
          title: 'logs-*',
          name: 'logs-*',
          timeFieldName: '@timestamp',
          allowNoIndex: true,
        },
      },
      {
        id: 'metrics-*',
        type: 'index-pattern',
        typeMigrationVersion: '8.0.0',
        attributes: {
          title: 'metrics-*',
          name: 'metrics-*',
          timeFieldName: '@timestamp',
          allowNoIndex: true,
        },
      },
    ]);
  });

  it('finds and updates existing data views to use new name/title values', async () => {
    mockSavedObjectsClient.get.mockImplementation((type, id) => {
      if (type !== 'index-pattern') {
        throw new Error(`savedObjectsClient.get called with unexpected type ${type}`);
      }

      if (id === 'logs-*') {
        return Promise.resolve({
          id: 'logs-*',
          type: 'index-pattern',
          attributes: {
            title: 'logs-*',
            timeFieldName: '@timestamp',
            allowNoIndex: true,
          },
          references: [],
        });
      } else if (id === 'metrics-*') {
        return Promise.resolve({
          id: 'metrics-*',
          type: 'index-pattern',
          attributes: {
            title: 'metrics-*',
            timeFieldName: '@timestamp',
            allowNoIndex: true,
          },
          references: [],
        });
      }

      return Promise.reject(
        SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', id)
      );
    });

    (getFleetManagedDataViewDefinitions as jest.Mock).mockReturnValueOnce([
      {
        id: 'logs-*',
        type: 'index-pattern',
        typeMigrationVersion: '8.0.0',
        attributes: {
          title: 'logs-*',
          name: 'logs-*',
          timeFieldName: '@timestamp',
          allowNoIndex: true,
        },
      },
      {
        id: 'metrics-*',
        type: 'index-pattern',
        typeMigrationVersion: '8.0.0',
        attributes: {
          title: 'metrics-*',
          name: 'metrics-*',
          timeFieldName: '@timestamp',
          allowNoIndex: true,
        },
      },
    ]);

    await ensureFleetManagedDataViews({
      savedObjectsClient: mockSavedObjectsClient,
      logger: mockLogger,
    });

    expect(mockSavedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
      'index-pattern',
      'logs-*',
      expect.objectContaining({ name: 'logs-*' })
    );
    expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
      'index-pattern',
      'metrics-*',
      expect.objectContaining({ name: 'metrics-*' })
    );
  });
});
