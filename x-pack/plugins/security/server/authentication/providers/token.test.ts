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

import { ElasticsearchErrorHelpers } from '../../../../../../src/core/server';
import { TokenAuthenticationProvider } from './token';

describe('TokenAuthenticationProvider', () => {
  let provider: TokenAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions();
    provider = new TokenAuthenticationProvider(mockOptions);
  });

  describe('`login` method', () => {
    it('succeeds with valid login attempt, creates session and authHeaders', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const user = mockAuthenticatedUser();

      const credentials = { username: 'user', password: 'password' };
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
      });

      const authenticationResult = await provider.login(request, credentials);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: 'password', ...credentials },
      });

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'token' });
      expect(authenticationResult.state).toEqual(tokenPair);
      expect(authenticationResult.authHeaders).toEqual({ authorization });
    });

    it('fails if token cannot be generated during login attempt', async () => {
      const request = httpServerMock.createKibanaRequest();
      const credentials = { username: 'user', password: 'password' };

      const authenticationError = new Error('Invalid credentials');
      mockOptions.client.callAsInternalUser.mockRejectedValue(authenticationError);

      const authenticationResult = await provider.login(request, credentials);

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: 'password', ...credentials },
      });

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
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
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.login(request, credentials);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: 'password', ...credentials },
      });

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle authentication via `authorization` header.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle authentication via `authorization` header even if state contains valid credentials.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'foo',
        refreshToken: 'bar',
      });

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not redirect AJAX requests that can not be authenticated to the login page.', async () => {
      // Add `kbn-xsrf` header to make `can_redirect_request` think that it's AJAX request and
      // avoid triggering of redirect logic.
      const authenticationResult = await provider.authenticate(
        httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } }),
        null
      );

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('redirects non-AJAX requests that can not be authenticated to the login page.', async () => {
      const authenticationResult = await provider.authenticate(
        httpServerMock.createKibanaRequest({ path: '/s/foo/some-path # that needs to be encoded' }),
        null
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        '/base-path/login?next=%2Fbase-path%2Fs%2Ffoo%2Fsome-path%20%23%20that%20needs%20to%20be%20encoded'
      );
    });

    it('succeeds if only state is available.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const user = mockAuthenticatedUser();
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'token' });
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.authHeaders).toEqual({ authorization });
      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds with valid session even if requiring a token refresh', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.client.asScoped.mockImplementation(scopeableRequest => {
        if (scopeableRequest?.headers.authorization === `Bearer ${tokenPair.accessToken}`) {
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
            ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
          );
          return mockScopedClusterClient;
        }

        if (scopeableRequest?.headers.authorization === 'Bearer newfoo') {
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          return mockScopedClusterClient;
        }

        throw new Error('Unexpected call');
      });

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'newfoo',
        refreshToken: 'newbar',
      });

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'token' });
      expect(authenticationResult.state).toEqual({ accessToken: 'newfoo', refreshToken: 'newbar' });
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Bearer newfoo' });
      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if authentication with token from state fails with unknown error.', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const authenticationError = new errors.InternalServerError('something went wrong');
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if token refresh is rejected with unknown error', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const refreshError = new errors.InternalServerError('failed to refresh token');
      mockOptions.tokens.refresh.mockRejectedValue(refreshError);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(refreshError);
    });

    it('redirects non-AJAX requests to /login and clears session if token cannot be refreshed', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/some-path', headers: {} });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        '/base-path/login?next=%2Fbase-path%2Fsome-path'
      );
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toEqual(null);
      expect(authenticationResult.error).toBeUndefined();
    });

    it('does not redirect AJAX requests if token token cannot be refreshed', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-xsrf': 'xsrf' },
        path: '/some-path',
      });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { 'kbn-xsrf': 'xsrf', authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if new access token is rejected after successful refresh', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const authenticationError = new errors.AuthenticationException('Some error');
      mockOptions.client.asScoped.mockImplementation(scopeableRequest => {
        if (scopeableRequest?.headers.authorization === `Bearer ${tokenPair.accessToken}`) {
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
            ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
          );
          return mockScopedClusterClient;
        }

        if (scopeableRequest?.headers.authorization === 'Bearer newfoo') {
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
          return mockScopedClusterClient;
        }

        throw new Error('Unexpected call');
      });

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'newfoo',
        refreshToken: 'newbar',
      });

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });
  });

  describe('`logout` method', () => {
    it('returns `redirected` if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      let deauthenticateResult = await provider.logout(request);
      expect(deauthenticateResult.redirected()).toBe(true);

      deauthenticateResult = await provider.logout(request, null);
      expect(deauthenticateResult.redirected()).toBe(true);

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('fails if `tokens.invalidate` fails', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      mockOptions.tokens.invalidate.mockRejectedValue(failureReason);

      const authenticationResult = await provider.logout(request, tokenPair);

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to /login if tokens are invalidated successfully', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.tokens.invalidate.mockResolvedValue(undefined);

      const authenticationResult = await provider.logout(request, tokenPair);

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?msg=LOGGED_OUT');
    });

    it('redirects to /login with optional search parameters if tokens are invalidated successfully', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { yep: 'nope' } });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.tokens.invalidate.mockResolvedValue(undefined);

      const authenticationResult = await provider.logout(request, tokenPair);

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?yep=nope');
    });
  });
});
