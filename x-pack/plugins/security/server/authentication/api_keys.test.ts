/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyClusterClient, ILegacyScopedClusterClient } from '../../../../../src/core/server';
import { SecurityLicense } from '../../common/licensing';
import { APIKeys } from './api_keys';

import {
  httpServerMock,
  loggingSystemMock,
  elasticsearchServiceMock,
} from '../../../../../src/core/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';

const encodeToBase64 = (str: string) => Buffer.from(str).toString('base64');

describe('API Keys', () => {
  let apiKeys: APIKeys;
  let mockClusterClient: jest.Mocked<ILegacyClusterClient>;
  let mockScopedClusterClient: jest.Mocked<ILegacyScopedClusterClient>;
  let mockLicense: jest.Mocked<SecurityLicense>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();
    mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(
      (mockScopedClusterClient as unknown) as jest.Mocked<ILegacyScopedClusterClient>
    );

    mockLicense = licenseMock.create();
    mockLicense.isEnabled.mockReturnValue(true);

    apiKeys = new APIKeys({
      clusterClient: mockClusterClient,
      logger: loggingSystemMock.create().get('api-keys'),
      license: mockLicense,
    });
  });

  describe('areAPIKeysEnabled()', () => {
    it('returns false when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);

      const result = await apiKeys.areAPIKeysEnabled();
      expect(result).toEqual(false);
      expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
      expect(mockScopedClusterClient.callAsInternalUser).not.toHaveBeenCalled();
      expect(mockClusterClient.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('returns false when the exception metadata indicates api keys are disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();
      (error as any).body = {
        error: { 'disabled.feature': 'api_keys' },
      };
      mockClusterClient.callAsInternalUser.mockRejectedValue(error);
      const result = await apiKeys.areAPIKeysEnabled();
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(false);
    });

    it('returns true when the operation completes without error', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.callAsInternalUser.mockResolvedValue({});
      const result = await apiKeys.areAPIKeysEnabled();
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(true);
    });

    it('throws the original error when exception metadata does not indicate that api keys are disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();
      (error as any).body = {
        error: { 'disabled.feature': 'something_else' },
      };

      mockClusterClient.callAsInternalUser.mockRejectedValue(error);
      expect(apiKeys.areAPIKeysEnabled()).rejects.toThrowError(error);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
    });

    it('throws the original error when exception metadata does not contain `disabled.feature`', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();
      (error as any).body = {};

      mockClusterClient.callAsInternalUser.mockRejectedValue(error);
      expect(apiKeys.areAPIKeysEnabled()).rejects.toThrowError(error);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
    });

    it('throws the original error when exception contains no metadata', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();

      mockClusterClient.callAsInternalUser.mockRejectedValue(error);
      expect(apiKeys.areAPIKeysEnabled()).rejects.toThrowError(error);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
    });

    it('calls callCluster with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.callAsInternalUser.mockResolvedValueOnce({});

      const result = await apiKeys.areAPIKeysEnabled();
      expect(result).toEqual(true);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('shield.invalidateAPIKey', {
        body: {
          id: 'kibana-api-key-service-test',
        },
      });
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

  describe('grantAsInternalUser()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.grantAsInternalUser(httpServerMock.createKibanaRequest(), {
        name: 'test_api_key',
        role_descriptors: {},
      });
      expect(result).toBeNull();

      expect(mockClusterClient.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('calls callAsInternalUser with proper parameters for the Basic scheme', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.callAsInternalUser.mockResolvedValueOnce({
        id: '123',
        name: 'key-name',
        api_key: 'abc123',
        expires: '1d',
      });
      const result = await apiKeys.grantAsInternalUser(
        httpServerMock.createKibanaRequest({
          headers: {
            authorization: `Basic ${encodeToBase64('foo:bar')}`,
          },
        }),
        {
          name: 'test_api_key',
          role_descriptors: { foo: true },
          expiration: '1d',
        }
      );
      expect(result).toEqual({
        api_key: 'abc123',
        id: '123',
        name: 'key-name',
        expires: '1d',
      });
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('shield.grantAPIKey', {
        body: {
          api_key: {
            name: 'test_api_key',
            role_descriptors: { foo: true },
            expiration: '1d',
          },
          grant_type: 'password',
          username: 'foo',
          password: 'bar',
        },
      });
    });

    it('calls callAsInternalUser with proper parameters for the Bearer scheme', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.callAsInternalUser.mockResolvedValueOnce({
        id: '123',
        name: 'key-name',
        api_key: 'abc123',
      });
      const result = await apiKeys.grantAsInternalUser(
        httpServerMock.createKibanaRequest({
          headers: {
            authorization: `Bearer foo-access-token`,
          },
        }),
        {
          name: 'test_api_key',
          role_descriptors: { foo: true },
          expiration: '1d',
        }
      );
      expect(result).toEqual({
        api_key: 'abc123',
        id: '123',
        name: 'key-name',
      });
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('shield.grantAPIKey', {
        body: {
          api_key: {
            name: 'test_api_key',
            role_descriptors: { foo: true },
            expiration: '1d',
          },
          grant_type: 'access_token',
          access_token: 'foo-access-token',
        },
      });
    });

    it('throw error for other schemes', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      await expect(
        apiKeys.grantAsInternalUser(
          httpServerMock.createKibanaRequest({
            headers: {
              authorization: `Digest username="foo"`,
            },
          }),
          {
            name: 'test_api_key',
            role_descriptors: { foo: true },
            expiration: '1d',
          }
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unsupported scheme \\"Digest\\" for granting API Key"`
      );
      expect(mockClusterClient.callAsInternalUser).not.toHaveBeenCalled();
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

  describe('invalidateAsInternalUser()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.invalidateAsInternalUser({ id: '123' });
      expect(result).toBeNull();
      expect(mockClusterClient.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('calls callCluster with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.callAsInternalUser.mockResolvedValueOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      const result = await apiKeys.invalidateAsInternalUser({ id: '123' });
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('shield.invalidateAPIKey', {
        body: {
          id: '123',
        },
      });
    });

    it('Only passes id as a parameter', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.callAsInternalUser.mockResolvedValueOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      const result = await apiKeys.invalidateAsInternalUser({
        id: '123',
        name: 'abc',
      } as any);
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('shield.invalidateAPIKey', {
        body: {
          id: '123',
        },
      });
    });
  });
});
