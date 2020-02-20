/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { MockAuthenticationProviderOptions, mockAuthenticationProviderOptions } from './base.mock';

import { ElasticsearchErrorHelpers } from '../../../../../../src/core/server';
import { HTTPAuthenticationProvider } from './http';

describe('HTTPAuthenticationProvider', () => {
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions();
  });

  it('throws if `schemes` are not specified', () => {
    const providerOptions = mockAuthenticationProviderOptions();

    expect(() => new HTTPAuthenticationProvider(providerOptions)).toThrowError(
      'Supported schemes should be specified'
    );
    expect(() => new HTTPAuthenticationProvider(providerOptions, {})).toThrowError(
      'Supported schemes should be specified'
    );
    expect(() => new HTTPAuthenticationProvider(providerOptions, { schemes: [] })).toThrowError(
      'Supported schemes should be specified'
    );

    expect(
      () =>
        new HTTPAuthenticationProvider(providerOptions, { schemes: [], autoSchemesEnabled: false })
    ).toThrowError('Supported schemes should be specified');
  });

  describe('`login` method', () => {
    it('does not handle login', async () => {
      const provider = new HTTPAuthenticationProvider(mockOptions, {
        enabled: true,
        autoSchemesEnabled: true,
        schemes: ['apikey'],
      });
      const authenticationResult = await provider.login();

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(authenticationResult.notHandled()).toBe(true);
    });
  });

  describe('`authenticate` method', () => {
    const testCasesToNotHandle = [
      {
        autoSchemesEnabled: false,
        isProviderEnabled: () => false,
        schemes: ['basic'],
        header: 'Bearer xxx',
      },
      {
        autoSchemesEnabled: false,
        isProviderEnabled: () => false,
        schemes: ['bearer'],
        header: 'Basic xxx',
      },
      {
        autoSchemesEnabled: false,
        isProviderEnabled: () => false,
        schemes: ['basic', 'apikey'],
        header: 'Bearer xxx',
      },
      {
        autoSchemesEnabled: true,
        isProviderEnabled: () => false,
        schemes: ['basic', 'apikey'],
        header: 'Bearer xxx',
      },
      {
        autoSchemesEnabled: true,
        isProviderEnabled: (provider: string) => provider === 'basic',
        schemes: ['basic'],
        header: 'Bearer xxx',
      },
      {
        autoSchemesEnabled: true,
        isProviderEnabled: () => true,
        schemes: [],
        header: 'ApiKey xxx',
      },
    ];

    const testCasesToHandle = [
      {
        autoSchemesEnabled: false,
        isProviderEnabled: () => false,
        schemes: ['basic'],
        header: 'Basic xxx',
      },
      {
        autoSchemesEnabled: false,
        isProviderEnabled: () => false,
        schemes: ['bearer'],
        header: 'Bearer xxx',
      },
      {
        autoSchemesEnabled: false,
        isProviderEnabled: () => false,
        schemes: ['basic', 'apikey'],
        header: 'ApiKey xxx',
      },
      {
        autoSchemesEnabled: false,
        isProviderEnabled: () => false,
        schemes: ['some-weird-scheme'],
        header: 'some-weird-scheme xxx',
      },
      ...['saml', 'oidc', 'pki', 'kerberos', 'token'].map(bearerProviderType => ({
        autoSchemesEnabled: true,
        isProviderEnabled: (providerType: string) => providerType === bearerProviderType,
        schemes: ['apikey'],
        header: 'Bearer xxx',
      })),
      {
        autoSchemesEnabled: true,
        isProviderEnabled: (provider: string) => provider === 'basic',
        schemes: ['apikey'],
        header: 'Basic xxx',
      },
      {
        autoSchemesEnabled: true,
        isProviderEnabled: () => true,
        schemes: [],
        header: 'Bearer xxx',
      },
    ];

    it('does not handle authentication for requests without `authorization` header.', async () => {
      const request = httpServerMock.createKibanaRequest();

      const provider = new HTTPAuthenticationProvider(mockOptions, {
        enabled: true,
        autoSchemesEnabled: true,
        schemes: ['apikey'],
      });
      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle authentication for requests with empty scheme in `authorization` header.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { authorization: '' } });

      const provider = new HTTPAuthenticationProvider(mockOptions, {
        enabled: true,
        autoSchemesEnabled: true,
        schemes: ['apikey'],
      });
      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle authentication via `authorization` header if scheme is not supported.', async () => {
      for (const {
        isProviderEnabled,
        autoSchemesEnabled,
        schemes,
        header,
      } of testCasesToNotHandle) {
        const request = httpServerMock.createKibanaRequest({ headers: { authorization: header } });

        mockOptions.isProviderEnabled.mockImplementation(isProviderEnabled);
        const provider = new HTTPAuthenticationProvider(mockOptions, {
          enabled: true,
          autoSchemesEnabled,
          schemes,
        });
        const authenticationResult = await provider.authenticate(request);

        expect(request.headers.authorization).toBe(header);
        expect(authenticationResult.notHandled()).toBe(true);
      }

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('succeeds if authentication via `authorization` header with supported scheme succeeds.', async () => {
      const user = mockAuthenticatedUser();
      for (const { isProviderEnabled, autoSchemesEnabled, schemes, header } of testCasesToHandle) {
        const request = httpServerMock.createKibanaRequest({ headers: { authorization: header } });

        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
        mockOptions.client.asScoped.mockClear();

        mockOptions.isProviderEnabled.mockImplementation(isProviderEnabled);
        const provider = new HTTPAuthenticationProvider(mockOptions, {
          enabled: true,
          autoSchemesEnabled,
          schemes,
        });
        const authenticationResult = await provider.authenticate(request);

        expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
          headers: { authorization: header },
        });
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
          'shield.authenticate'
        );

        expect(authenticationResult.succeeded()).toBe(true);
        expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'http' });
        expect(authenticationResult.state).toBeUndefined();
        expect(authenticationResult.authHeaders).toBeUndefined();
        expect(request.headers.authorization).toBe(header);
      }
    });

    it('fails if authentication via `authorization` header with supported scheme fails.', async () => {
      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      for (const { isProviderEnabled, autoSchemesEnabled, schemes, header } of testCasesToHandle) {
        const request = httpServerMock.createKibanaRequest({ headers: { authorization: header } });

        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
        mockOptions.client.asScoped.mockClear();

        mockOptions.isProviderEnabled.mockImplementation(isProviderEnabled);
        const provider = new HTTPAuthenticationProvider(mockOptions, {
          enabled: true,
          autoSchemesEnabled,
          schemes,
        });
        const authenticationResult = await provider.authenticate(request);

        expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
          headers: { authorization: header },
        });
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
          'shield.authenticate'
        );

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
        expect(authenticationResult.authResponseHeaders).toBeUndefined();
        expect(request.headers.authorization).toBe(header);
      }
    });
  });

  describe('`logout` method', () => {
    it('does not handle logout', async () => {
      const provider = new HTTPAuthenticationProvider(mockOptions, {
        enabled: true,
        autoSchemesEnabled: true,
        schemes: ['apikey'],
      });
      const authenticationResult = await provider.logout();

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(authenticationResult.notHandled()).toBe(true);
    });
  });
});
