/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors } from 'elasticsearch';
import sinon from 'sinon';
import { requestFixture } from '../../__tests__/__fixtures__/request';
import { LoginAttempt } from '../login_attempt';
import { mockAuthenticationProviderOptions } from './base.mock';
import { TokenAuthenticationProvider } from './token';

describe('TokenAuthenticationProvider', () => {
  describe('`authenticate` method', () => {
    let provider: TokenAuthenticationProvider;
    let callWithRequest: sinon.SinonStub;
    let callWithInternalUser: sinon.SinonStub;
    beforeEach(() => {
      const providerOptions = mockAuthenticationProviderOptions();
      callWithRequest = providerOptions.client.callWithRequest as sinon.SinonStub;
      callWithInternalUser = providerOptions.client.callWithInternalUser as sinon.SinonStub;

      provider = new TokenAuthenticationProvider(providerOptions);
    });

    it('does not redirect AJAX requests that can not be authenticated to the login page.', async () => {
      // Add `kbn-xsrf` header to make `can_redirect_request` think that it's AJAX request and
      // avoid triggering of redirect logic.
      const authenticationResult = await provider.authenticate(
        requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } }),
        null
      );

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('redirects non-AJAX requests that can not be authenticated to the login page.', async () => {
      const authenticationResult = await provider.authenticate(
        requestFixture({ path: '/some-path # that needs to be encoded', basePath: '/s/foo' }),
        null
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        '/base-path/login?next=%2Fs%2Ffoo%2Fsome-path%20%23%20that%20needs%20to%20be%20encoded'
      );
    });

    it('does not handle authentication if state exists, but accessToken property is missing.', async () => {
      const authenticationResult = await provider.authenticate(
        requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } }),
        {}
      );

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('succeeds with valid login attempt and stores in session', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'password', username: 'user', password: 'password' },
        })
        .resolves({ access_token: 'foo', refresh_token: 'bar' });

      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toEqual({ accessToken: 'foo', refreshToken: 'bar' });
      expect(request.headers.authorization).toEqual(`Bearer foo`);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('succeeds if only `authorization` header is available.', async () => {
      const authorization = 'Bearer foo';
      const request = requestFixture({ headers: { authorization } });
      const user = { username: 'user' };

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('does not return session state for header-based auth', async () => {
      const authorization = 'Bearer foo';
      const request = requestFixture({ headers: { authorization } });
      const user = { username: 'user' };

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.state).not.toEqual({
        authorization: request.headers.authorization,
      });
    });

    it('succeeds if only state is available.', async () => {
      const request = requestFixture();
      const accessToken = 'foo';
      const user = { username: 'user' };
      const authorization = `Bearer ${accessToken}`;

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, { accessToken });

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toBeUndefined();
      sinon.assert.calledOnce(callWithRequest);
    });

    it('succeeds with valid session even if requiring a token refresh', async () => {
      const user = { username: 'user' };
      const request = requestFixture();

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer foo' } }), 'shield.authenticate')
        .rejects({ statusCode: 401 });

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'bar' },
        })
        .resolves({ access_token: 'newfoo', refresh_token: 'newbar' });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer newfoo' } }),
          'shield.authenticate'
        )
        .returns(user);

      const accessToken = 'foo';
      const refreshToken = 'bar';
      const authenticationResult = await provider.authenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledTwice(callWithRequest);
      sinon.assert.calledOnce(callWithInternalUser);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toEqual({ accessToken: 'newfoo', refreshToken: 'newbar' });
    });

    it('does not handle `authorization` header with unsupported schema even if state contains valid credentials.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      const accessToken = 'foo';
      const user = { username: 'user' };
      const authorization = `Bearer ${accessToken}`;

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, { accessToken });

      sinon.assert.notCalled(callWithRequest);
      expect(request.headers.authorization).toBe('Basic ***');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('authenticates only via `authorization` header even if state is available.', async () => {
      const accessToken = 'foo';
      const authorization = `Bearer ${accessToken}`;
      const request = requestFixture({ headers: { authorization } });
      const user = { username: 'user' };

      // GetUser will be called with request's `authorization` header.
      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request, { accessToken });

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).not.toEqual({ accessToken });
      sinon.assert.calledOnce(callWithRequest);
    });

    it('fails if token cannot be generated during login attempt', async () => {
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      const authenticationError = new Error('Invalid credentials');
      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'password', username: 'user', password: 'password' },
        })
        .rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.notCalled(callWithRequest);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if user cannot be retrieved during login attempt', async () => {
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'password', username: 'user', password: 'password' },
        })
        .resolves({ access_token: 'foo', refresh_token: 'bar' });

      const authenticationError = new Error('Some error');
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledOnce(callWithRequest);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if authentication with token from header fails with unknown error', async () => {
      const authorization = `Bearer foo`;
      const request = requestFixture({ headers: { authorization } });

      const authenticationError = new errors.InternalServerError('something went wrong');
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledOnce(callWithRequest);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if authentication with token from state fails with unknown error.', async () => {
      const accessToken = 'foo';
      const request = requestFixture();

      const authenticationError = new errors.InternalServerError('something went wrong');
      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${accessToken}` } }),
          'shield.authenticate'
        )
        .rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request, { accessToken });

      sinon.assert.calledOnce(callWithRequest);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if token refresh is rejected with unknown error', async () => {
      const request = requestFixture();

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer foo' } }), 'shield.authenticate')
        .rejects({ statusCode: 401 });

      const refreshError = new errors.InternalServerError('failed to refresh token');
      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'bar' },
        })
        .rejects(refreshError);

      const accessToken = 'foo';
      const refreshToken = 'bar';
      const authenticationResult = await provider.authenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithRequest);
      sinon.assert.calledOnce(callWithInternalUser);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(refreshError);
    });

    it('redirects non-AJAX requests to /login and clears session if token document is missing', async () => {
      const request = requestFixture({ path: '/some-path' });

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer foo' } }), 'shield.authenticate')
        .rejects({
          statusCode: 500,
          body: { error: { reason: 'token document is missing and must be present' } },
        });

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'bar' },
        })
        .rejects(new errors.BadRequest('failed to refresh token'));

      const accessToken = 'foo';
      const refreshToken = 'bar';
      const authenticationResult = await provider.authenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithRequest);
      sinon.assert.calledOnce(callWithInternalUser);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?next=%2Fsome-path');
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toEqual(null);
      expect(authenticationResult.error).toBeUndefined();
    });

    it('redirects non-AJAX requests to /login and clears session if token refresh fails with 400 error', async () => {
      const request = requestFixture({ path: '/some-path' });

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer foo' } }), 'shield.authenticate')
        .rejects({ statusCode: 401 });

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'bar' },
        })
        .rejects(new errors.BadRequest('failed to refresh token'));

      const accessToken = 'foo';
      const refreshToken = 'bar';
      const authenticationResult = await provider.authenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithRequest);
      sinon.assert.calledOnce(callWithInternalUser);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?next=%2Fsome-path');
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toEqual(null);
      expect(authenticationResult.error).toBeUndefined();
    });

    it('does not redirect AJAX requests if token refresh fails with 400 error', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' }, path: '/some-path' });

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer foo' } }), 'shield.authenticate')
        .rejects({ statusCode: 401 });

      const authenticationError = new errors.BadRequest('failed to refresh token');
      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'bar' },
        })
        .rejects(authenticationError);

      const accessToken = 'foo';
      const refreshToken = 'bar';
      const authenticationResult = await provider.authenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithRequest);
      sinon.assert.calledOnce(callWithInternalUser);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(authenticationError);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if new access token is rejected after successful refresh', async () => {
      const request = requestFixture();

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer foo' } }), 'shield.authenticate')
        .rejects({ statusCode: 401 });

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'bar' },
        })
        .resolves({ access_token: 'newfoo', refresh_token: 'newbar' });

      const authenticationError = new errors.AuthenticationException('Some error');
      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer newfoo' } }),
          'shield.authenticate'
        )
        .rejects(authenticationError);

      const accessToken = 'foo';
      const refreshToken = 'bar';
      const authenticationResult = await provider.authenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledTwice(callWithRequest);
      sinon.assert.calledOnce(callWithInternalUser);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });
  });

  describe('`deauthenticate` method', () => {
    let provider: TokenAuthenticationProvider;
    let callWithInternalUser: sinon.SinonStub;
    beforeEach(() => {
      const providerOptions = mockAuthenticationProviderOptions();
      callWithInternalUser = providerOptions.client.callWithInternalUser as sinon.SinonStub;

      provider = new TokenAuthenticationProvider(providerOptions);
    });

    describe('`deauthenticate` method', () => {
      it('returns `notHandled` if state is not presented or does not include both access and refresh token.', async () => {
        const request = requestFixture();
        const accessToken = 'foo';
        const refreshToken = 'bar';

        let deauthenticateResult = await provider.deauthenticate(request);
        expect(deauthenticateResult.notHandled()).toBe(true);

        deauthenticateResult = await provider.deauthenticate(request, {});
        expect(deauthenticateResult.notHandled()).toBe(true);

        deauthenticateResult = await provider.deauthenticate(request, { accessToken });
        expect(deauthenticateResult.notHandled()).toBe(true);

        deauthenticateResult = await provider.deauthenticate(request, { refreshToken });
        expect(deauthenticateResult.notHandled()).toBe(true);

        sinon.assert.notCalled(callWithInternalUser);

        deauthenticateResult = await provider.deauthenticate(request, {
          accessToken,
          refreshToken,
        });
        expect(deauthenticateResult.notHandled()).toBe(false);
      });

      it('fails if call to delete access token responds with an error', async () => {
        const request = requestFixture();
        const accessToken = 'foo';
        const refreshToken = 'bar';

        const failureReason = new Error('failed to delete token');
        callWithInternalUser
          .withArgs('shield.deleteAccessToken', { body: { token: accessToken } })
          .rejects(failureReason);

        const authenticationResult = await provider.deauthenticate(request, {
          accessToken,
          refreshToken,
        });

        sinon.assert.calledOnce(callWithInternalUser);
        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
          body: { token: accessToken },
        });

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });

      it('fails if call to delete refresh token responds with an error', async () => {
        const request = requestFixture();
        const accessToken = 'foo';
        const refreshToken = 'bar';

        callWithInternalUser
          .withArgs('shield.deleteAccessToken', { body: { token: accessToken } })
          .returns({ invalidated_tokens: 1 });

        const failureReason = new Error('failed to delete token');
        callWithInternalUser
          .withArgs('shield.deleteAccessToken', { body: { refresh_token: refreshToken } })
          .rejects(failureReason);

        const authenticationResult = await provider.deauthenticate(request, {
          accessToken,
          refreshToken,
        });

        sinon.assert.calledTwice(callWithInternalUser);
        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
          body: { refresh_token: refreshToken },
        });

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });

      it('redirects to /login if tokens are deleted successfully', async () => {
        const request = requestFixture();
        const accessToken = 'foo';
        const refreshToken = 'bar';

        callWithInternalUser
          .withArgs('shield.deleteAccessToken', { body: { token: accessToken } })
          .returns({ invalidated_tokens: 1 });

        callWithInternalUser
          .withArgs('shield.deleteAccessToken', { body: { refresh_token: refreshToken } })
          .returns({ invalidated_tokens: 1 });

        const authenticationResult = await provider.deauthenticate(request, {
          accessToken,
          refreshToken,
        });

        sinon.assert.calledTwice(callWithInternalUser);
        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
          body: { token: accessToken },
        });
        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
          body: { refresh_token: refreshToken },
        });

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/base-path/login');
      });

      it('redirects to /login with optional search parameters if tokens are deleted successfully', async () => {
        const request = requestFixture({ search: '?yep' });
        const accessToken = 'foo';
        const refreshToken = 'bar';

        callWithInternalUser
          .withArgs('shield.deleteAccessToken', { body: { token: accessToken } })
          .returns({ created: true });

        callWithInternalUser
          .withArgs('shield.deleteAccessToken', { body: { refresh_token: refreshToken } })
          .returns({ created: true });

        const authenticationResult = await provider.deauthenticate(request, {
          accessToken,
          refreshToken,
        });

        sinon.assert.calledTwice(callWithInternalUser);
        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
          body: { token: accessToken },
        });
        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
          body: { refresh_token: refreshToken },
        });

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/base-path/login?yep');
      });
    });
  });
});
