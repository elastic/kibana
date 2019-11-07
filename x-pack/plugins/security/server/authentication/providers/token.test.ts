/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { errors } from 'elasticsearch';
import sinon from 'sinon';

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import {
  MockAuthenticationProviderOptions,
  mockAuthenticationProviderOptions,
  mockScopedClusterClient,
} from './base.mock';

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
      const request = httpServerMock.createKibanaRequest();
      const user = mockAuthenticatedUser();

      const credentials = { username: 'user', password: 'password' };
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      mockOptions.client.callAsInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'password', ...credentials },
        })
        .resolves({ access_token: tokenPair.accessToken, refresh_token: tokenPair.refreshToken });

      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.login(request, credentials);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toEqual(tokenPair);
      expect(authenticationResult.authHeaders).toEqual({ authorization });
    });

    it('fails if token cannot be generated during login attempt', async () => {
      const request = httpServerMock.createKibanaRequest();
      const credentials = { username: 'user', password: 'password' };

      const authenticationError = new Error('Invalid credentials');
      mockOptions.client.callAsInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'password', ...credentials },
        })
        .rejects(authenticationError);

      const authenticationResult = await provider.login(request, credentials);

      sinon.assert.notCalled(mockOptions.client.asScoped);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if user cannot be retrieved during login attempt', async () => {
      const request = httpServerMock.createKibanaRequest();
      const credentials = { username: 'user', password: 'password' };
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.client.callAsInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'password', ...credentials },
        })
        .resolves({ access_token: tokenPair.accessToken, refresh_token: tokenPair.refreshToken });

      const authenticationError = new Error('Some error');
      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects(authenticationError);

      const authenticationResult = await provider.login(request, credentials);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });
  });

  describe('`authenticate` method', () => {
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

    it('succeeds if only `authorization` header is available and returns neither state nor authHeaders.', async () => {
      const authorization = 'Bearer foo';
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });
      const user = mockAuthenticatedUser();

      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.authHeaders).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
    });

    it('succeeds if only state is available.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const user = mockAuthenticatedUser();
      const authorization = `Bearer ${tokenPair.accessToken}`;

      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.authHeaders).toEqual({ authorization });
      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds with valid session even if requiring a token refresh', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      mockOptions.tokens.refresh
        .withArgs(tokenPair.refreshToken)
        .resolves({ accessToken: 'newfoo', refreshToken: 'newbar' });

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: 'Bearer newfoo' } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(mockOptions.tokens.refresh);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toEqual({ accessToken: 'newfoo', refreshToken: 'newbar' });
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Bearer newfoo' });
      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('does not handle `authorization` header with unsupported schema even if state contains valid credentials.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Basic ***' },
      });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const user = mockAuthenticatedUser();
      const authorization = `Bearer ${tokenPair.accessToken}`;

      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.notCalled(mockOptions.client.asScoped);
      expect(request.headers.authorization).toBe('Basic ***');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('authenticates only via `authorization` header even if state is available.', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer foo-from-header`;
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });
      const user = mockAuthenticatedUser();

      // GetUser will be called with request's `authorization` header.
      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.authHeaders).toBeUndefined();
      expect(request.headers.authorization).toEqual('Bearer foo-from-header');
    });

    it('fails if authentication with token from header fails with unknown error', async () => {
      const authorization = `Bearer foo`;
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });

      const authenticationError = new errors.InternalServerError('something went wrong');
      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if authentication with token from state fails with unknown error.', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const request = httpServerMock.createKibanaRequest();

      const authenticationError = new errors.InternalServerError('something went wrong');
      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if token refresh is rejected with unknown error', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      const refreshError = new errors.InternalServerError('failed to refresh token');
      mockOptions.tokens.refresh.withArgs(tokenPair.refreshToken).rejects(refreshError);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(mockOptions.tokens.refresh);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(refreshError);
    });

    it('redirects non-AJAX requests to /login and clears session if token document is missing', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/some-path' });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({
          statusCode: 500,
          body: { error: { reason: 'token document is missing and must be present' } },
        });

      mockOptions.tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(mockOptions.tokens.refresh);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        '/base-path/login?next=%2Fbase-path%2Fsome-path'
      );
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toEqual(null);
      expect(authenticationResult.error).toBeUndefined();
    });

    it('redirects non-AJAX requests to /login and clears session if token cannot be refreshed', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/some-path' });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      mockOptions.tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(mockOptions.tokens.refresh);

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

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      mockOptions.tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(mockOptions.tokens.refresh);

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

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      mockOptions.tokens.refresh
        .withArgs(tokenPair.refreshToken)
        .resolves({ accessToken: 'newfoo', refreshToken: 'newbar' });

      const authenticationError = new errors.AuthenticationException('Some error');
      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: 'Bearer newfoo' } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(mockOptions.tokens.refresh);

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

      sinon.assert.notCalled(mockOptions.tokens.invalidate);
    });

    it('fails if `tokens.invalidate` fails', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      mockOptions.tokens.invalidate.withArgs(tokenPair).rejects(failureReason);

      const authenticationResult = await provider.logout(request, tokenPair);

      sinon.assert.calledOnce(mockOptions.tokens.invalidate);
      sinon.assert.calledWithExactly(mockOptions.tokens.invalidate, tokenPair);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to /login if tokens are invalidated successfully', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.tokens.invalidate.withArgs(tokenPair).resolves();

      const authenticationResult = await provider.logout(request, tokenPair);

      sinon.assert.calledOnce(mockOptions.tokens.invalidate);
      sinon.assert.calledWithExactly(mockOptions.tokens.invalidate, tokenPair);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?msg=LOGGED_OUT');
    });

    it('redirects to /login with optional search parameters if tokens are invalidated successfully', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { yep: 'nope' } });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.tokens.invalidate.withArgs(tokenPair).resolves();

      const authenticationResult = await provider.logout(request, tokenPair);

      sinon.assert.calledOnce(mockOptions.tokens.invalidate);
      sinon.assert.calledWithExactly(mockOptions.tokens.invalidate, tokenPair);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?yep=nope');
    });
  });
});
