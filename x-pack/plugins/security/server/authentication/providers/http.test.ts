/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import type { ScopeableRequest } from 'src/core/server';
import { elasticsearchServiceMock, httpServerMock } from 'src/core/server/mocks';

import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { securityMock } from '../../mocks';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import type { MockAuthenticationProviderOptions } from './base.mock';
import { mockAuthenticationProviderOptions } from './base.mock';
import { HTTPAuthenticationProvider } from './http';

function expectAuthenticateCall(
  mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
  scopeableRequest: ScopeableRequest
) {
  expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
  expect(mockClusterClient.asScoped).toHaveBeenCalledWith(scopeableRequest);

  const mockScopedClusterClient = mockClusterClient.asScoped.mock.results[0].value;
  expect(mockScopedClusterClient.asCurrentUser.security.authenticate).toHaveBeenCalledTimes(1);
}

describe('HTTPAuthenticationProvider', () => {
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'http' });
  });

  it('throws if `schemes` are not specified', () => {
    const providerOptions = mockAuthenticationProviderOptions();

    expect(() => new HTTPAuthenticationProvider(providerOptions, undefined as any)).toThrowError(
      'Supported schemes should be specified'
    );
    expect(() => new HTTPAuthenticationProvider(providerOptions, {} as any)).toThrowError(
      'Supported schemes should be specified'
    );
    expect(
      () => new HTTPAuthenticationProvider(providerOptions, { supportedSchemes: new Set() })
    ).toThrowError('Supported schemes should be specified');
  });

  describe('`login` method', () => {
    it('does not handle login', async () => {
      const provider = new HTTPAuthenticationProvider(mockOptions, {
        supportedSchemes: new Set(['apikey']),
      });

      await expect(provider.login()).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle authentication for requests without `authorization` header.', async () => {
      const provider = new HTTPAuthenticationProvider(mockOptions, {
        supportedSchemes: new Set(['apikey']),
      });

      await expect(provider.authenticate(httpServerMock.createKibanaRequest())).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
    });

    it('does not handle authentication for requests with empty scheme in `authorization` header.', async () => {
      const provider = new HTTPAuthenticationProvider(mockOptions, {
        supportedSchemes: new Set(['apikey']),
      });

      await expect(
        provider.authenticate(
          httpServerMock.createKibanaRequest({ headers: { authorization: '' } })
        )
      ).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
    });

    it('does not handle authentication via `authorization` header if scheme is not supported.', async () => {
      for (const { schemes, header } of [
        { schemes: ['basic'], header: 'Bearer xxx' },
        { schemes: ['bearer'], header: 'Basic xxx' },
        { schemes: ['basic', 'apikey'], header: 'Bearer xxx' },
        { schemes: ['basic', 'bearer'], header: 'ApiKey xxx' },
      ]) {
        const request = httpServerMock.createKibanaRequest({ headers: { authorization: header } });

        const provider = new HTTPAuthenticationProvider(mockOptions, {
          supportedSchemes: new Set(schemes),
        });

        await expect(provider.authenticate(request)).resolves.toEqual(
          AuthenticationResult.notHandled()
        );

        expect(request.headers.authorization).toBe(header);
      }

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
    });

    it('succeeds if authentication via `authorization` header with supported scheme succeeds.', async () => {
      const user = mockAuthenticatedUser();
      for (const { schemes, header } of [
        { schemes: ['basic'], header: 'Basic xxx' },
        { schemes: ['bearer'], header: 'Bearer xxx' },
        { schemes: ['basic', 'apikey'], header: 'ApiKey xxx' },
        { schemes: ['some-weird-scheme'], header: 'some-weird-scheme xxx' },
        { schemes: ['apikey', 'bearer'], header: 'Bearer xxx' },
      ]) {
        const request = httpServerMock.createKibanaRequest({ headers: { authorization: header } });

        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
        mockOptions.client.asScoped.mockClear();

        const provider = new HTTPAuthenticationProvider(mockOptions, {
          supportedSchemes: new Set(schemes),
        });

        await expect(provider.authenticate(request)).resolves.toEqual(
          AuthenticationResult.succeeded({
            ...user,
            authentication_provider: { type: 'http', name: 'http' },
          })
        );

        expectAuthenticateCall(mockOptions.client, { headers: { authorization: header } });

        expect(request.headers.authorization).toBe(header);
      }
    });

    it('fails if authentication via `authorization` header with supported scheme fails.', async () => {
      const failureReason = new errors.ResponseError(securityMock.createApiResponse({ body: {} }));
      for (const { schemes, header } of [
        { schemes: ['basic'], header: 'Basic xxx' },
        { schemes: ['bearer'], header: 'Bearer xxx' },
        { schemes: ['basic', 'apikey'], header: 'ApiKey xxx' },
        { schemes: ['some-weird-scheme'], header: 'some-weird-scheme xxx' },
        { schemes: ['apikey', 'bearer'], header: 'Bearer xxx' },
      ]) {
        const request = httpServerMock.createKibanaRequest({ headers: { authorization: header } });

        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
          failureReason
        );
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
        mockOptions.client.asScoped.mockClear();

        const provider = new HTTPAuthenticationProvider(mockOptions, {
          supportedSchemes: new Set(schemes),
        });

        await expect(provider.authenticate(request)).resolves.toEqual(
          AuthenticationResult.failed(failureReason)
        );

        expectAuthenticateCall(mockOptions.client, { headers: { authorization: header } });

        expect(request.headers.authorization).toBe(header);
      }
    });
  });

  describe('`logout` method', () => {
    it('does not handle logout', async () => {
      const provider = new HTTPAuthenticationProvider(mockOptions, {
        supportedSchemes: new Set(['apikey']),
      });

      await expect(provider.logout()).resolves.toEqual(DeauthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    const provider = new HTTPAuthenticationProvider(mockOptions, {
      supportedSchemes: new Set(['apikey']),
    });
    expect(provider.getHTTPAuthenticationScheme()).toBeNull();
  });
});
