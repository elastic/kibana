/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { errors } from 'elasticsearch';

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { MockAuthenticationProviderOptions, mockAuthenticationProviderOptions } from './base.mock';

import {
  LegacyElasticsearchErrorHelpers,
  ILegacyClusterClient,
  ScopeableRequest,
} from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { TokenAuthenticationProvider } from './token';

function expectAuthenticateCall(
  mockClusterClient: jest.Mocked<ILegacyClusterClient>,
  scopeableRequest: ScopeableRequest
) {
  expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
  expect(mockClusterClient.asScoped).toHaveBeenCalledWith(scopeableRequest);

  const mockScopedClusterClient = mockClusterClient.asScoped.mock.results[0].value;
  expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
  expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');
}

describe('TokenAuthenticationProvider', () => {
  let provider: TokenAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'token' });
    provider = new TokenAuthenticationProvider(mockOptions);
  });

  describe('`login` method', () => {
    it('succeeds with valid login attempt, creates session and authHeaders', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const user = mockAuthenticatedUser();

      const credentials = { username: 'user', password: 'password' };
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
      });

      await expect(provider.login(request, credentials)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'token' },
          { authHeaders: { authorization }, state: tokenPair }
        )
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: 'password', ...credentials },
      });
    });

    it('fails if token cannot be generated during login attempt', async () => {
      const request = httpServerMock.createKibanaRequest();
      const credentials = { username: 'user', password: 'password' };

      const authenticationError = new Error('Invalid credentials');
      mockOptions.client.callAsInternalUser.mockRejectedValue(authenticationError);

      await expect(provider.login(request, credentials)).resolves.toEqual(
        AuthenticationResult.failed(authenticationError)
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: 'password', ...credentials },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if user cannot be retrieved during login attempt', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const credentials = { username: 'user', password: 'password' };
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
      });

      const authenticationError = new Error('Some error');
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.login(request, credentials)).resolves.toEqual(
        AuthenticationResult.failed(authenticationError)
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
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
            path: '/s/foo/some-path # that needs to be encoded',
          }),
          null
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/login?next=%2Fmock-server-basepath%2Fs%2Ffoo%2Fsome-path%20%23%20that%20needs%20to%20be%20encoded'
        )
      );
    });

    it('succeeds if only state is available.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const user = mockAuthenticatedUser();
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'token' },
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

      mockOptions.client.asScoped.mockImplementation((scopeableRequest) => {
        if (scopeableRequest?.headers.authorization === `Bearer ${tokenPair.accessToken}`) {
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
            LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
          );
          return mockScopedClusterClient;
        }

        if (scopeableRequest?.headers.authorization === 'Bearer newfoo') {
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          return mockScopedClusterClient;
        }

        throw new Error('Unexpected call');
      });

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'newfoo',
        refreshToken: 'newbar',
      });

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'token' },
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

      const authenticationError = new errors.InternalServerError('something went wrong');
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
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

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const refreshError = new errors.InternalServerError('failed to refresh token');
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

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
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

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
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

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
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

    it('fails if new access token is rejected after successful refresh', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const authenticationError = new errors.AuthenticationException('Some error');
      mockOptions.client.asScoped.mockImplementation((scopeableRequest) => {
        if (scopeableRequest?.headers.authorization === `Bearer ${tokenPair.accessToken}`) {
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
            LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
          );
          return mockScopedClusterClient;
        }

        if (scopeableRequest?.headers.authorization === 'Bearer newfoo') {
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
          return mockScopedClusterClient;
        }

        throw new Error('Unexpected call');
      });

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'newfoo',
        refreshToken: 'newbar',
      });

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(authenticationError)
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(request.headers).not.toHaveProperty('authorization');
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request)).resolves.toEqual(DeauthenticationResult.notHandled());

      await expect(provider.logout(request, null)).resolves.toEqual(
        DeauthenticationResult.notHandled()
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

    it('redirects to /login if tokens are invalidated successfully', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.tokens.invalidate.mockResolvedValue(undefined);

      await expect(provider.logout(request, tokenPair)).resolves.toEqual(
        DeauthenticationResult.redirectTo('/mock-server-basepath/login?msg=LOGGED_OUT')
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);
    });

    it('redirects to /login with optional search parameters if tokens are invalidated successfully', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { yep: 'nope' } });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.tokens.invalidate.mockResolvedValue(undefined);

      await expect(provider.logout(request, tokenPair)).resolves.toEqual(
        DeauthenticationResult.redirectTo('/mock-server-basepath/login?yep=nope')
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('bearer');
  });
});
