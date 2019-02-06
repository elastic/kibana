/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import { requestFixture } from '../../../__tests__/__fixtures__/request';
import { LoginAttempt } from '../../login_attempt';
import { TokenAuthenticationProvider } from '../token';

describe('TokenAuthenticationProvider', () => {
  describe('`authenticate` method', () => {
    let provider;
    let callWithRequest;
    let callWithInternalUser;
    beforeEach(() => {
      callWithRequest = sinon.stub();
      callWithInternalUser = sinon.stub();
      provider = new TokenAuthenticationProvider({
        client: { callWithRequest, callWithInternalUser },
        log() {},
        basePath: '/base-path'
      });
    });

    it('does not redirect AJAX requests that can not be authenticated to the login page.', async () => {
      // Add `kbn-xsrf` header to make `can_redirect_request` think that it's AJAX request and
      // avoid triggering of redirect logic.
      const authenticationResult = await provider.authenticate(
        requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } }),
        null
      );

      expect(authenticationResult.notHandled()).to.be(true);
    });

    it('redirects non-AJAX requests that can not be authenticated to the login page.', async () => {
      const authenticationResult = await provider.authenticate(
        requestFixture({ path: '/some-path # that needs to be encoded', basePath: '/s/foo' }),
        null
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be(
        '/base-path/login?next=%2Fs%2Ffoo%2Fsome-path%20%23%20that%20needs%20to%20be%20encoded'
      );
    });

    it('does not handle authentication if state exists, but accessToken property is missing.',
      async () => {
        const authenticationResult = await provider.authenticate(
          requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } }),
          {}
        );

        expect(authenticationResult.notHandled()).to.be(true);
      });

    it('succeeds with valid login attempt and stores in session', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      request.loginAttempt.returns(loginAttempt);

      callWithInternalUser
        .withArgs('shield.getAccessToken', { body: { grant_type: 'password', username: 'user', password: 'password' } })
        .returns(Promise.resolve({ access_token: 'foo', refresh_token: 'bar' }));

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql(user);
      expect(authenticationResult.state).to.be.eql({ accessToken: 'foo', refreshToken: 'bar' });
      expect(request.headers.authorization).to.be.eql(`Bearer foo`);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('succeeds if only `authorization` header is available.', async () => {
      const authorization = 'Bearer foo';
      const request = requestFixture({ headers: { authorization } });
      const user = { username: 'user' };

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql(user);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('does not return session state for header-based auth', async () => {
      const authorization = 'Bearer foo';
      const request = requestFixture({ headers: { authorization } });
      const user = { username: 'user' };

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.state).not.to.eql({ authorization: request.headers.authorization });
    });

    it('succeeds if only state is available.', async () => {
      const request = requestFixture();
      const accessToken = 'foo';
      const user = { username: 'user' };
      const authorization = `Bearer ${accessToken}`;

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request, { accessToken });

      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql(user);
      expect(authenticationResult.state).to.be.eql(undefined);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('succeeds with valid session even if requiring a token refresh', async () => {
      const user = { username: 'user' };
      const request = requestFixture();

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer foo' } }), 'shield.authenticate')
        .returns(Promise.reject({ body: { error: { reason: 'token expired' } } }));

      callWithInternalUser
        .withArgs('shield.getAccessToken', { body: { grant_type: 'refresh_token', refresh_token: 'bar' } })
        .returns(Promise.resolve({ access_token: 'newfoo', refresh_token: 'newbar' }));

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer newfoo' } }), 'shield.authenticate')
        .returns(user);

      const accessToken = 'foo';
      const refreshToken = 'bar';
      const authenticationResult = await provider.authenticate(request, { accessToken, refreshToken });

      sinon.assert.calledTwice(callWithRequest);
      sinon.assert.calledOnce(callWithInternalUser);

      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql(user);
      expect(authenticationResult.state).to.be.eql({ accessToken: 'newfoo', refreshToken: 'newbar' });
    });

    it('does not handle `authorization` header with unsupported schema even if state contains valid credentials.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      const accessToken = 'foo';
      const user = { username: 'user' };
      const authorization = `Bearer ${accessToken}`;

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request, { accessToken });

      sinon.assert.notCalled(callWithRequest);
      expect(request.headers.authorization).to.be('Basic ***');
      expect(authenticationResult.notHandled()).to.be(true);
    });

    it('fails if state contains invalid credentials.', async () => {
      const request = requestFixture();
      const accessToken = 'foo';
      const authorization = `Bearer ${accessToken}`;

      const authenticationError = new Error('Forbidden');
      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .returns(Promise.reject(authenticationError));

      const authenticationResult = await provider.authenticate(request, { accessToken });

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.user).to.be.eql(undefined);
      expect(authenticationResult.state).to.be.eql(undefined);
      expect(authenticationResult.error).to.be.eql(authenticationError);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('authenticates only via `authorization` header even if state is available.', async () => {
      const accessToken = 'foo';
      const authorization = `Bearer ${accessToken}`;
      const request = requestFixture({ headers: { authorization } });
      const user = { username: 'user' };

      // GetUser will be called with request's `authorization` header.
      callWithRequest.withArgs(request, 'shield.authenticate').returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request, { authorization });

      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql(user);
      expect(authenticationResult.state).not.to.eql({ accessToken });
      sinon.assert.calledOnce(callWithRequest);
    });

    it('fails if token cannot be generated during login attempt', async () => {
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      request.loginAttempt.returns(loginAttempt);

      const authenticationError = new Error('Invalid credentials');
      callWithInternalUser
        .withArgs('shield.getAccessToken', { body: { grant_type: 'password', username: 'user', password: 'password' } })
        .returns(Promise.reject(authenticationError));

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.notCalled(callWithRequest);

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.user).to.be.eql(undefined);
      expect(authenticationResult.state).to.be.eql(undefined);
      expect(authenticationResult.error).to.be.eql(authenticationError);
    });

    it('fails if user cannot be retrieved during login attempt', async () => {
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      request.loginAttempt.returns(loginAttempt);

      callWithInternalUser
        .withArgs('shield.getAccessToken', { body: { grant_type: 'password', username: 'user', password: 'password' } })
        .returns(Promise.resolve({ access_token: 'foo', refresh_token: 'bar' }));

      const authenticationError = new Error('Some error');
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.reject(authenticationError));

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledOnce(callWithRequest);

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.user).to.be.eql(undefined);
      expect(authenticationResult.state).to.be.eql(undefined);
      expect(authenticationResult.error).to.be.eql(authenticationError);
    });

    it('fails when header contains a rejected token', async () => {
      const authorization = `Bearer foo`;
      const request = requestFixture({ headers: { authorization } });

      const authenticationError = new Error('Forbidden');
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.reject(authenticationError));

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledOnce(callWithRequest);

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.user).to.be.eql(undefined);
      expect(authenticationResult.state).to.be.eql(undefined);
      expect(authenticationResult.error).to.be.eql(authenticationError);
    });

    it('fails when session contains a rejected token', async () => {
      const accessToken = 'foo';
      const request = requestFixture();

      const authenticationError = new Error('Forbidden');
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.reject(authenticationError));

      const authenticationResult = await provider.authenticate(request, { accessToken });

      sinon.assert.calledOnce(callWithRequest);

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.user).to.be.eql(undefined);
      expect(authenticationResult.state).to.be.eql(undefined);
      expect(authenticationResult.error).to.be.eql(authenticationError);
    });

    it('fails if token refresh is rejected', async () => {
      const request = requestFixture();

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer foo' } }), 'shield.authenticate')
        .returns(Promise.reject({ body: { error: { reason: 'token expired' } } }));

      const authenticationError = new Error('failed to refresh token');
      callWithInternalUser
        .withArgs('shield.getAccessToken', { body: { grant_type: 'refresh_token', refresh_token: 'bar' } })
        .returns(Promise.reject(authenticationError));

      const accessToken = 'foo';
      const refreshToken = 'bar';
      const authenticationResult = await provider.authenticate(request, { accessToken, refreshToken });

      sinon.assert.calledOnce(callWithRequest);
      sinon.assert.calledOnce(callWithInternalUser);

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.user).to.be.eql(undefined);
      expect(authenticationResult.state).to.be.eql(undefined);
      expect(authenticationResult.error).to.be.eql(authenticationError);
    });

    it('fails if new access token is rejected after successful refresh', async () => {
      const request = requestFixture();

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer foo' } }), 'shield.authenticate')
        .returns(Promise.reject({ body: { error: { reason: 'token expired' } } }));

      callWithInternalUser
        .withArgs('shield.getAccessToken', { body: { grant_type: 'refresh_token', refresh_token: 'bar' } })
        .returns(Promise.resolve({ access_token: 'newfoo', refresh_token: 'newbar' }));

      const authenticationError = new Error('Some error');
      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer newfoo' } }), 'shield.authenticate')
        .returns(Promise.reject(authenticationError));

      const accessToken = 'foo';
      const refreshToken = 'bar';
      const authenticationResult = await provider.authenticate(request, { accessToken, refreshToken });

      sinon.assert.calledTwice(callWithRequest);
      sinon.assert.calledOnce(callWithInternalUser);

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.user).to.be.eql(undefined);
      expect(authenticationResult.state).to.be.eql(undefined);
      expect(authenticationResult.error).to.be.eql(authenticationError);
    });
  });

  describe('`deauthenticate` method', () => {
    let provider;
    let callWithInternalUser;
    beforeEach(() => {
      callWithInternalUser = sinon.stub();
      provider = new TokenAuthenticationProvider({
        client: { callWithInternalUser },
        log() {},
        basePath: '/base-path'
      });
    });

    describe('`deauthenticate` method', () => {
      it('returns `notHandled` if state is not presented or does not include both access and refresh token.', async () => {
        const request = requestFixture();
        const accessToken = 'foo';
        const refreshToken = 'bar';

        let deauthenticateResult = await provider.deauthenticate(request);
        expect(deauthenticateResult.notHandled()).to.be(true);

        deauthenticateResult = await provider.deauthenticate(request, {});
        expect(deauthenticateResult.notHandled()).to.be(true);

        deauthenticateResult = await provider.deauthenticate(request, { accessToken });
        expect(deauthenticateResult.notHandled()).to.be(true);

        deauthenticateResult = await provider.deauthenticate(request, { refreshToken });
        expect(deauthenticateResult.notHandled()).to.be(true);

        sinon.assert.notCalled(callWithInternalUser);

        deauthenticateResult = await provider.deauthenticate(request, { accessToken, refreshToken });
        expect(deauthenticateResult.notHandled()).to.be(false);
      });

      it('fails if call to delete access token responds with an error', async () => {
        const request = requestFixture();
        const accessToken = 'foo';
        const refreshToken = 'bar';

        const failureReason = new Error('failed to delete token');
        callWithInternalUser
          .withArgs('shield.deleteAccessToken', { body: { token: accessToken } })
          .returns(Promise.reject(failureReason));

        const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

        sinon.assert.calledOnce(callWithInternalUser);
        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.deleteAccessToken',
          { body: { token: accessToken } }
        );

        expect(authenticationResult.failed()).to.be(true);
        expect(authenticationResult.error).to.be(failureReason);
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
          .returns(Promise.reject(failureReason));

        const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

        sinon.assert.calledTwice(callWithInternalUser);
        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.deleteAccessToken',
          { body: { refresh_token: refreshToken } }
        );

        expect(authenticationResult.failed()).to.be(true);
        expect(authenticationResult.error).to.be(failureReason);
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

        const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

        sinon.assert.calledTwice(callWithInternalUser);
        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.deleteAccessToken',
          { body: { token: accessToken } }
        );
        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.deleteAccessToken',
          { body: { refresh_token: refreshToken } }
        );

        expect(authenticationResult.redirected()).to.be(true);
        expect(authenticationResult.redirectURL).to.be('/base-path/login');
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

        const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

        sinon.assert.calledTwice(callWithInternalUser);
        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.deleteAccessToken',
          { body: { token: accessToken } }
        );
        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.deleteAccessToken',
          { body: { refresh_token: refreshToken } }
        );

        expect(authenticationResult.redirected()).to.be(true);
        expect(authenticationResult.redirectURL).to.be('/base-path/login?yep');
      });
    });
  });
});
