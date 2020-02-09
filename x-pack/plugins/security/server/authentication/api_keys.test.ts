/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, IScopedClusterClient } from '../../../../../src/core/server';
import { SecurityLicense } from '../../common/licensing';
import { APIKeys } from './api_keys';

import {
  httpServerMock,
  loggingServiceMock,
  elasticsearchServiceMock,
} from '../../../../../src/core/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';

describe('API Keys', () => {
  let apiKeys: APIKeys;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClusterClient: jest.Mocked<IScopedClusterClient>;
  let mockLicense: jest.Mocked<SecurityLicense>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(
      (mockScopedClusterClient as unknown) as jest.Mocked<IScopedClusterClient>
    );

    mockLicense = licenseMock.create();
    mockLicense.isEnabled.mockReturnValue(true);

    apiKeys = new APIKeys({
      clusterClient: mockClusterClient,
      logger: loggingServiceMock.create().get('api-keys'),
      license: mockLicense,
    });
  });

  describe('create()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.create(httpServerMock.createKibanaRequest(), {
        name: '',
        role_descriptors: {},
      });
      expect(result).toBeNull();
      expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
    });

    it('calls callCluster with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValueOnce({
        id: '123',
        name: 'key-name',
        expiration: '1d',
        api_key: 'abc123',
      });
      const result = await apiKeys.create(httpServerMock.createKibanaRequest(), {
        name: 'key-name',
        role_descriptors: { foo: true },
        expiration: '1d',
      });
      expect(result).toEqual({
        api_key: 'abc123',
        expiration: '1d',
        id: '123',
        name: 'key-name',
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'shield.createAPIKey',
        {
          body: {
            name: 'key-name',
            role_descriptors: { foo: true },
            expiration: '1d',
          },
        }
      );
    });
  });

  describe('invalidate()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.invalidate(httpServerMock.createKibanaRequest(), {
        id: '123',
      });
      expect(result).toBeNull();
      expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
    });

    it('calls callCluster with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValueOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      const result = await apiKeys.invalidate(httpServerMock.createKibanaRequest(), {
        id: '123',
      });
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'shield.invalidateAPIKey',
        {
          body: {
            id: '123',
          },
        }
      );
    });

    it(`Only passes id as a parameter`, async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValueOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      const result = await apiKeys.invalidate(httpServerMock.createKibanaRequest(), {
        id: '123',
        name: 'abc',
      } as any);
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'shield.invalidateAPIKey',
        {
          body: {
            id: '123',
          },
        }
      );
    });
  });
});
