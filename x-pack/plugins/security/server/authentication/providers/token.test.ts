/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import type { ScopeableRequest } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { securityMock } from '../../mocks';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import type { MockAuthenticationProviderOptions } from './base.mock';
import { mockAuthenticationProviderOptions } from './base.mock';
import { TokenAuthenticationProvider } from './token';

function expectAuthenticateCall(
  mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
  scopeableRequest: ScopeableRequest
) {
  expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
  expect(mockClusterClient.asScoped).toHaveBeenCalledWith(scopeableRequest);

  const mockScopedClusterClient = mockClusterClient.asScoped.mock.results[0].value;
  expect(mockScopedClusterClient.asCurrentUser.security.authenticate).toHaveBeenCalledTimes(1);
}

describe('TokenAuthenticationProvider', () => {
  let provider: TokenAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'token' });
    mockOptions.urls.loggedOut.mockReturnValue('/some-logged-out-page');

    provider = new TokenAuthenticationProvider(mockOptions);
  });

  describe('`login` method', () => {
    it('succeeds with valid login attempt, creates session and authHeaders', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const user = mockAuthenticatedUser();

      const credentials = { username: 'user', password: 'password' };
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      mockOptions.client.asInternalUser.security.getToken.mockResponse(
        // @ts-expect-error not full interface
        {
          access_token: tokenPair.accessToken,
          refresh_token: tokenPair.refreshToken,
          authentication: user,
        }
      );

      await expect(provider.login(request, credentials)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'token', name: 'token' } },
          {
            authHeaders: { authorization },
            userProfileGrant: { type: 'accessToken', accessToken: tokenPair.accessToken },
            state: tokenPair,
          }
        )
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.asInternalUser.security.getToken).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.security.getToken).toHaveBeenCalledWith({
        body: { grant_type: 'password', ...credentials },
      });
    });

    it('fails if token cannot be generated during login attempt', async () => {
      const request = httpServerMock.createKibanaRequest();
      const credentials = { username: 'user', password: 'password' };

      const authenticationError = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: {} })
      );
      mockOptions.client.asInternalUser.security.getToken.mockRejectedValue(authenticationError);

      await expect(provider.login(request, credentials)).resolves.toEqual(
        AuthenticationResult.failed(authenticationError)
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.asInternalUser.security.getToken).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.security.getToken).toHaveBeenCalledWith({
        body: { grant_type: 'password', ...credentials },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle authentication via `authorization` header.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('does not handle authentication via `authorization` header even if state contains valid credentials.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      await expect(
        provider.authenticate(request, { accessToken: 'foo', refreshToken: 'bar' })
      ).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('does not redirect AJAX requests that can not be authenticated to the login page.', async () => {
      // Add `kbn-xsrf` header to make `can_redirect_request` think that it's AJAX request and
      // avoid triggering of redirect logic.
      await expect(
        provider.authenticate(
          httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } }),
          null
        )
      ).resolves.toEqual(AuthenticationResult.notHandled());
    });

    it('does not redirect requests that do not require authentication to the login page.', async () => {
      await expect(
        provider.authenticate(httpServerMock.createKibanaRequest({ routeAuthRequired: false }))
      ).resolves.toEqual(AuthenticationResult.notHandled());
    });

    it('redirects non-AJAX requests that can not be authenticated to the login page.', async () => {
      await expect(
        provider.authenticate(
          httpServerMock.createKibanaRequest({
            path: '/s/foo/some path that needs to be encoded',
          }),
          null
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/login?next=%2Fmock-server-basepath%2Fs%2Ffoo%2Fsome%2520path%2520that%2520needs%2520to%2520be%2520encoded'
        )
      );
    });

    it('succeeds if only state is available.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const user = mockAuthenticatedUser();
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'token', name: 'token' } },
          { authHeaders: { authorization } }
        )
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds with valid session even if requiring a token refresh', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'newfoo',
        refreshToken: 'newbar',
        authenticationInfo: user,
      });

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'token', name: 'token' } },
          {
            authHeaders: { authorization: 'Bearer newfoo' },
            state: { accessToken: 'newfoo', refreshToken: 'newbar' },
          }
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if authentication with token from state fails with unknown error.', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const authenticationError = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: {} })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        authenticationError
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(authenticationError)
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token refresh is rejected with unknown error', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const refreshError = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: {} })
      );
      mockOptions.tokens.refresh.mockRejectedValue(refreshError);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(refreshError)
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('redirects non-AJAX requests to /login and clears session if token cannot be refreshed', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/some-path', headers: {} });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/login?next=%2Fmock-server-basepath%2Fsome-path',
          { state: null }
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('does not redirect AJAX requests if token token cannot be refreshed', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-xsrf': 'xsrf' },
        path: '/some-path',
      });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'))
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expectAuthenticateCall(mockOptions.client, {
        headers: { 'kbn-xsrf': 'xsrf', authorization },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('does not redirect non-AJAX requests that do not require authentication if token token cannot be refreshed', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: {},
        routeAuthRequired: false,
        path: '/some-path',
      });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'))
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request)).resolves.toEqual(DeauthenticationResult.notHandled());

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('redirects to the logged out URL if state is `null`.', async () => {
      await expect(provider.logout(httpServerMock.createKibanaRequest(), null)).resolves.toEqual(
        DeauthenticationResult.redirectTo('/some-logged-out-page')
      );

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('fails if `tokens.invalidate` fails', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      mockOptions.tokens.invalidate.mockRejectedValue(failureReason);

      await expect(provider.logout(request, tokenPair)).resolves.toEqual(
        DeauthenticationResult.failed(failureReason)
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);
    });

    it('redirects to the logged out URL if tokens are invalidated successfully.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.tokens.invalidate.mockResolvedValue(undefined);

      await expect(provider.logout(request, tokenPair)).resolves.toEqual(
        DeauthenticationResult.redirectTo('/some-logged-out-page')
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('bearer');
  });
});
