/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import type { SecurityLicense } from '../../../common/licensing';
import { licenseMock } from '../../../common/licensing/index.mock';
import { APIKeys } from './api_keys';

const encodeToBase64 = (str: string) => Buffer.from(str).toString('base64');

describe('API Keys', () => {
  let apiKeys: APIKeys;
  let mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let mockScopedClusterClient: ReturnType<
    typeof elasticsearchServiceMock.createScopedClusterClient
  >;
  let mockLicense: jest.Mocked<SecurityLicense>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

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
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).not.toHaveBeenCalled();
      expect(
        mockScopedClusterClient.asCurrentUser.security.invalidateApiKey
      ).not.toHaveBeenCalled();
    });

    it('returns false when the exception metadata indicates api keys are disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();
      (error as any).body = {
        error: { 'disabled.feature': 'api_keys' },
      };
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockRejectedValue(error);
      const result = await apiKeys.areAPIKeysEnabled();
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
      expect(result).toEqual(false);
    });

    it('returns true when the operation completes without error', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockResponse({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.areAPIKeysEnabled();
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
      expect(result).toEqual(true);
    });

    it('throws the original error when exception metadata does not indicate that api keys are disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();
      (error as any).body = {
        error: { 'disabled.feature': 'something_else' },
      };

      mockClusterClient.asInternalUser.security.invalidateApiKey.mockRejectedValue(error);
      await expect(apiKeys.areAPIKeysEnabled()).rejects.toThrowError(error);
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
    });

    it('throws the original error when exception metadata does not contain `disabled.feature`', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();
      (error as any).body = {};

      mockClusterClient.asInternalUser.security.invalidateApiKey.mockRejectedValue(error);
      await expect(apiKeys.areAPIKeysEnabled()).rejects.toThrowError(error);
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
    });

    it('throws the original error when exception contains no metadata', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      const error = new Error();

      mockClusterClient.asInternalUser.security.invalidateApiKey.mockRejectedValue(error);
      await expect(apiKeys.areAPIKeysEnabled()).rejects.toThrowError(error);
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledTimes(1);
    });

    it('calls `invalidateApiKey` with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });

      const result = await apiKeys.areAPIKeysEnabled();
      expect(result).toEqual(true);
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledWith({
        body: {
          ids: ['kibana-api-key-service-test'],
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
      expect(mockScopedClusterClient.asCurrentUser.security.createApiKey).not.toHaveBeenCalled();
    });

    it('calls `createApiKey` with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);

      mockScopedClusterClient.asCurrentUser.security.createApiKey.mockResponseOnce({
        id: '123',
        name: 'key-name',
        // @ts-expect-error @elastic/elsticsearch CreateApiKeyResponse.expiration: number
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
      expect(mockScopedClusterClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
        body: {
          name: 'key-name',
          role_descriptors: { foo: true },
          expiration: '1d',
        },
      });
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

      expect(mockClusterClient.asInternalUser.security.grantApiKey).not.toHaveBeenCalled();
    });

    it('calls `grantApiKey` with proper parameters for the Basic scheme', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
        id: '123',
        name: 'key-name',
        api_key: 'abc123',
        // @ts-expect-error invalid definition
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
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
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

    it('calls `grantApiKey` with proper parameters for the Bearer scheme', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.grantApiKey.mockResponseOnce({
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
      expect(mockClusterClient.asInternalUser.security.grantApiKey).toHaveBeenCalledWith({
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
      expect(mockClusterClient.asInternalUser.security.grantApiKey).not.toHaveBeenCalled();
    });
  });

  describe('invalidate()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.invalidate(httpServerMock.createKibanaRequest(), {
        ids: ['123'],
      });
      expect(result).toBeNull();
      expect(
        mockScopedClusterClient.asCurrentUser.security.invalidateApiKey
      ).not.toHaveBeenCalled();
    });

    it('calls callCluster with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockScopedClusterClient.asCurrentUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.invalidate(httpServerMock.createKibanaRequest(), {
        ids: ['123'],
      });
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      expect(mockScopedClusterClient.asCurrentUser.security.invalidateApiKey).toHaveBeenCalledWith({
        body: {
          ids: ['123'],
        },
      });
    });

    it(`Only passes ids as a parameter`, async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockScopedClusterClient.asCurrentUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.invalidate(httpServerMock.createKibanaRequest(), {
        ids: ['123'],
        name: 'abc',
      } as any);
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      expect(mockScopedClusterClient.asCurrentUser.security.invalidateApiKey).toHaveBeenCalledWith({
        body: {
          ids: ['123'],
        },
      });
    });
  });

  describe('invalidateAsInternalUser()', () => {
    it('returns null when security feature is disabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const result = await apiKeys.invalidateAsInternalUser({ ids: ['123'] });
      expect(result).toBeNull();
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).not.toHaveBeenCalled();
    });

    it('calls callCluster with proper parameters', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.invalidateAsInternalUser({ ids: ['123'] });
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledWith({
        body: {
          ids: ['123'],
        },
      });
    });

    it('Only passes ids as a parameter', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockClusterClient.asInternalUser.security.invalidateApiKey.mockResponseOnce({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      const result = await apiKeys.invalidateAsInternalUser({
        ids: ['123'],
        name: 'abc',
      } as any);
      expect(result).toEqual({
        invalidated_api_keys: ['api-key-id-1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
        error_details: [],
      });
      expect(mockClusterClient.asInternalUser.security.invalidateApiKey).toHaveBeenCalledWith({
        body: {
          ids: ['123'],
        },
      });
    });
  });
});
