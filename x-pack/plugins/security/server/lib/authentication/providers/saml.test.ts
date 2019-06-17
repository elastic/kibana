/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import sinon from 'sinon';

import { requestFixture } from '../../__tests__/__fixtures__/request';
import { LoginAttempt } from '../login_attempt';
import { mockAuthenticationProviderOptions } from './base.mock';

import { SAMLAuthenticationProvider } from './saml';

describe('SAMLAuthenticationProvider', () => {
  let provider: SAMLAuthenticationProvider;
  let callWithRequest: sinon.SinonStub;
  let callWithInternalUser: sinon.SinonStub;
  beforeEach(() => {
    const providerOptions = mockAuthenticationProviderOptions({ basePath: '/test-base-path' });
    callWithRequest = providerOptions.client.callWithRequest as sinon.SinonStub;
    callWithInternalUser = providerOptions.client.callWithInternalUser as sinon.SinonStub;

    provider = new SAMLAuthenticationProvider(providerOptions, { realm: 'test-realm' });
  });

  it('throws if `realm` option is not specified', () => {
    const providerOptions = mockAuthenticationProviderOptions({ basePath: '/test-base-path' });

    expect(() => new SAMLAuthenticationProvider(providerOptions)).toThrowError(
      'Realm name must be specified'
    );
    expect(() => new SAMLAuthenticationProvider(providerOptions, {})).toThrowError(
      'Realm name must be specified'
    );
    expect(() => new SAMLAuthenticationProvider(providerOptions, { realm: '' })).toThrowError(
      'Realm name must be specified'
    );
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle `authorization` header with unsupported schema even if state contains a valid token.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic some:credentials' } });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      });

      sinon.assert.notCalled(callWithRequest);
      expect(request.headers.authorization).toBe('Basic some:credentials');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests with non-empty `loginAttempt`.', async () => {
      const request = requestFixture();

      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      });

      sinon.assert.notCalled(callWithRequest);
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('redirects non-AJAX request that can not be authenticated to the IdP.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser.withArgs('shield.samlPrepare').resolves({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://idp-host/path/login?SAMLRequest=some%20request%20'
      );
      expect(authenticationResult.state).toEqual({
        requestId: 'some-request-id',
        nextURL: `/s/foo/some-path`,
      });
    });

    it('fails if SAML request preparation fails.', async () => {
      const request = requestFixture({ path: '/some-path' });

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser.withArgs('shield.samlPrepare').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('gets token and redirects user to requested URL if SAML Response is valid.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      callWithInternalUser
        .withArgs('shield.samlAuthenticate')
        .resolves({ access_token: 'some-token', refresh_token: 'some-refresh-token' });

      const authenticationResult = await provider.authenticate(request, {
        requestId: 'some-request-id',
        nextURL: '/test-base-path/some-path',
      });

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlAuthenticate', {
        body: { ids: ['some-request-id'], content: 'saml-response-xml' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/test-base-path/some-path');
      expect(authenticationResult.state).toEqual({
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
      });
    });

    it('fails if SAML Response payload is presented but state does not contain SAML Request token.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      const authenticationResult = await provider.authenticate(request, {
        nextURL: '/test-base-path/some-path',
      } as any);

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest(
          'SAML response state does not have corresponding request id or redirect URL.'
        )
      );
    });

    it('fails if SAML Response payload is presented but state does not contain redirect URL.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      const authenticationResult = await provider.authenticate(request, {
        requestId: 'some-request-id',
      } as any);

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest(
          'SAML response state does not have corresponding request id or redirect URL.'
        )
      );
    });

    it('redirects to the default location if state is not presented.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      callWithInternalUser.withArgs('shield.samlAuthenticate').resolves({
        access_token: 'idp-initiated-login-token',
        refresh_token: 'idp-initiated-login-refresh-token',
      });

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlAuthenticate', {
        body: { ids: [], content: 'saml-response-xml' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/test-base-path/');
      expect(authenticationResult.state).toEqual({
        accessToken: 'idp-initiated-login-token',
        refreshToken: 'idp-initiated-login-refresh-token',
      });
    });

    it('fails if SAML Response is rejected.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      const failureReason = new Error('SAML response is stale!');
      callWithInternalUser.withArgs('shield.samlAuthenticate').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request, {
        requestId: 'some-request-id',
        nextURL: '/test-base-path/some-path',
      });

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlAuthenticate', {
        body: { ids: ['some-request-id'], content: 'saml-response-xml' },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = { username: 'user' };
      const request = requestFixture();

      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      });

      expect(request.headers.authorization).toBe('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = requestFixture();

      const failureReason = { statusCode: 500, message: 'Token is not valid!' };
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-invalid-token',
        refreshToken: 'some-invalid-refresh-token',
      });

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      sinon.assert.neverCalledWith(callWithRequest, 'shield.getAccessToken');
    });

    it('succeeds if token from the state is expired, but has been successfully refreshed.', async () => {
      const user = { username: 'user' };
      const request = requestFixture();

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer new-access-token' } }),
          'shield.authenticate'
        )
        .resolves(user);

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'valid-refresh-token' },
        })
        .resolves({ access_token: 'new-access-token', refresh_token: 'new-refresh-token' });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
      });

      expect(request.headers.authorization).toBe('Bearer new-access-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('fails if token from the state is expired and refresh attempt failed with unknown reason too.', async () => {
      const request = requestFixture();

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      const refreshFailureReason = {
        statusCode: 500,
        message: 'Something is wrong with refresh token.',
      };
      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'invalid-refresh-token' },
        })
        .rejects(refreshFailureReason);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
      });

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(refreshFailureReason);
    });

    it('fails for AJAX requests with user friendly message if refresh token is expired.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'expired-refresh-token' },
        })
        .rejects({ statusCode: 400 });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
      });

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
    });

    it('initiates SAML handshake for non-AJAX requests if access token document is missing.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser.withArgs('shield.samlPrepare').resolves({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .rejects({
          statusCode: 500,
          body: { error: { reason: 'token document is missing and must be present' } },
        });

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'expired-refresh-token' },
        })
        .rejects({ statusCode: 400 });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
      });

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://idp-host/path/login?SAMLRequest=some%20request%20'
      );
      expect(authenticationResult.state).toEqual({
        requestId: 'some-request-id',
        nextURL: `/s/foo/some-path`,
      });
    });

    it('initiates SAML handshake for non-AJAX requests if refresh token is expired.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser.withArgs('shield.samlPrepare').resolves({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: 'expired-refresh-token' },
        })
        .rejects({ statusCode: 400 });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
      });

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://idp-host/path/login?SAMLRequest=some%20request%20'
      );
      expect(authenticationResult.state).toEqual({
        requestId: 'some-request-id',
        nextURL: `/s/foo/some-path`,
      });
    });

    it('succeeds if `authorization` contains a valid token.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Bearer some-valid-token' } });

      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(request.headers.authorization).toBe('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from `authorization` header is rejected.', async () => {
      const request = requestFixture({ headers: { authorization: 'Bearer some-invalid-token' } });

      const failureReason = { statusCode: 401 };
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails if token from `authorization` header is rejected even if state contains a valid one.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Bearer some-invalid-token' } });

      const failureReason = { statusCode: 401 };
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer some-valid-token' } }))
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    describe('IdP initiated login with existing session', () => {
      it('fails if new SAML Response is rejected.', async () => {
        const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

        const user = { username: 'user' };
        callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

        const failureReason = new Error('SAML response is invalid!');
        callWithInternalUser.withArgs('shield.samlAuthenticate').rejects(failureReason);

        const authenticationResult = await provider.authenticate(request, {
          accessToken: 'some-valid-token',
          refreshToken: 'some-valid-refresh-token',
        });

        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlAuthenticate', {
          body: { ids: [], content: 'saml-response-xml' },
        });

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });

      it('fails if token received in exchange to new SAML Response is rejected.', async () => {
        const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

        // Call to `authenticate` using existing valid session.
        const user = { username: 'user' };
        callWithRequest
          .withArgs(
            sinon.match({ headers: { authorization: 'Bearer existing-valid-token' } }),
            'shield.authenticate'
          )
          .resolves(user);

        // Call to `authenticate` with token received in exchange to new SAML payload.
        const failureReason = new Error('Access token is invalid!');
        callWithRequest
          .withArgs(
            sinon.match({ headers: { authorization: 'Bearer new-invalid-token' } }),
            'shield.authenticate'
          )
          .rejects(failureReason);

        callWithInternalUser
          .withArgs('shield.samlAuthenticate')
          .resolves({ access_token: 'new-invalid-token', refresh_token: 'new-invalid-token' });

        const authenticationResult = await provider.authenticate(request, {
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        });

        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlAuthenticate', {
          body: { ids: [], content: 'saml-response-xml' },
        });

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });

      it('fails if fails to invalidate existing access/refresh tokens.', async () => {
        const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });
        const user = { username: 'user' };
        callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

        callWithInternalUser
          .withArgs('shield.samlAuthenticate')
          .resolves({ access_token: 'new-valid-token', refresh_token: 'new-valid-refresh-token' });

        const failureReason = new Error('Failed to invalidate token!');
        callWithInternalUser
          .withArgs('shield.deleteAccessToken', { body: { token: 'existing-valid-token' } })
          .rejects(failureReason);

        const authenticationResult = await provider.authenticate(request, {
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        });

        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlAuthenticate', {
          body: { ids: [], content: 'saml-response-xml' },
        });

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });

      it('redirects to the home page if new SAML Response is for the same user.', async () => {
        const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });
        const user = { username: 'user', authentication_realm: { name: 'saml1' } };
        callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

        callWithInternalUser
          .withArgs('shield.samlAuthenticate')
          .resolves({ access_token: 'new-valid-token', refresh_token: 'new-valid-refresh-token' });

        const deleteAccessTokenStub = callWithInternalUser
          .withArgs('shield.deleteAccessToken')
          .resolves({ invalidated_tokens: 1 });

        const authenticationResult = await provider.authenticate(request, {
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        });

        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlAuthenticate', {
          body: { ids: [], content: 'saml-response-xml' },
        });

        sinon.assert.calledTwice(deleteAccessTokenStub);
        sinon.assert.calledWithExactly(deleteAccessTokenStub, 'shield.deleteAccessToken', {
          body: { token: 'existing-valid-token' },
        });
        sinon.assert.calledWithExactly(deleteAccessTokenStub, 'shield.deleteAccessToken', {
          body: { refresh_token: 'existing-valid-refresh-token' },
        });

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/test-base-path/');
      });

      it('redirects to `overwritten_session` if new SAML Response is for the another user.', async () => {
        const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });
        const existingUser = { username: 'user', authentication_realm: { name: 'saml1' } };
        callWithRequest
          .withArgs(
            sinon.match({ headers: { authorization: 'Bearer existing-valid-token' } }),
            'shield.authenticate'
          )
          .resolves(existingUser);

        const newUser = { username: 'new-user', authentication_realm: { name: 'saml1' } };
        callWithRequest
          .withArgs(
            sinon.match({ headers: { authorization: 'Bearer new-valid-token' } }),
            'shield.authenticate'
          )
          .resolves(newUser);

        callWithInternalUser
          .withArgs('shield.samlAuthenticate')
          .resolves({ access_token: 'new-valid-token', refresh_token: 'new-valid-refresh-token' });

        const deleteAccessTokenStub = callWithInternalUser
          .withArgs('shield.deleteAccessToken')
          .resolves({ invalidated_tokens: 1 });

        const authenticationResult = await provider.authenticate(request, {
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        });

        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlAuthenticate', {
          body: { ids: [], content: 'saml-response-xml' },
        });

        sinon.assert.calledTwice(deleteAccessTokenStub);
        sinon.assert.calledWithExactly(deleteAccessTokenStub, 'shield.deleteAccessToken', {
          body: { token: 'existing-valid-token' },
        });
        sinon.assert.calledWithExactly(deleteAccessTokenStub, 'shield.deleteAccessToken', {
          body: { refresh_token: 'existing-valid-refresh-token' },
        });

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/test-base-path/overwritten_session');
      });

      it('redirects to `overwritten_session` if new SAML Response is for another realm.', async () => {
        const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });
        const existingUser = { username: 'user', authentication_realm: { name: 'saml1' } };
        callWithRequest
          .withArgs(
            sinon.match({ headers: { authorization: 'Bearer existing-valid-token' } }),
            'shield.authenticate'
          )
          .resolves(existingUser);

        const newUser = { username: 'user', authentication_realm: { name: 'saml2' } };
        callWithRequest
          .withArgs(
            sinon.match({ headers: { authorization: 'Bearer new-valid-token' } }),
            'shield.authenticate'
          )
          .resolves(newUser);

        callWithInternalUser
          .withArgs('shield.samlAuthenticate')
          .resolves({ access_token: 'new-valid-token', refresh_token: 'new-valid-refresh-token' });

        const deleteAccessTokenStub = callWithInternalUser
          .withArgs('shield.deleteAccessToken')
          .resolves({ invalidated_tokens: 1 });

        const authenticationResult = await provider.authenticate(request, {
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        });

        sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlAuthenticate', {
          body: { ids: [], content: 'saml-response-xml' },
        });

        sinon.assert.calledTwice(deleteAccessTokenStub);
        sinon.assert.calledWithExactly(deleteAccessTokenStub, 'shield.deleteAccessToken', {
          body: { token: 'existing-valid-token' },
        });
        sinon.assert.calledWithExactly(deleteAccessTokenStub, 'shield.deleteAccessToken', {
          body: { refresh_token: 'existing-valid-refresh-token' },
        });

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/test-base-path/overwritten_session');
      });
    });
  });

  describe('`deauthenticate` method', () => {
    it('returns `notHandled` if state is not presented or does not include access token.', async () => {
      const request = requestFixture();

      let deauthenticateResult = await provider.deauthenticate(request);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.deauthenticate(request, {} as any);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.deauthenticate(request, { somethingElse: 'x' } as any);
      expect(deauthenticateResult.notHandled()).toBe(true);

      sinon.assert.notCalled(callWithInternalUser);
    });

    it('fails if SAML logout call fails.', async () => {
      const request = requestFixture();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser.withArgs('shield.samlLogout').rejects(failureReason);

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails if SAML invalidate call fails.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser.withArgs('shield.samlInvalidate').rejects(failureReason);

      const authenticationResult = await provider.deauthenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlInvalidate', {
        body: {
          queryString: 'SAMLRequest=xxx%20yyy',
          realm: 'test-realm',
        },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to /logged_out if `redirect` field in SAML logout response is null.', async () => {
      const request = requestFixture();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      callWithInternalUser.withArgs('shield.samlLogout').resolves({ redirect: null });

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML logout response is not defined.', async () => {
      const request = requestFixture();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      callWithInternalUser.withArgs('shield.samlLogout').resolves({ redirect: undefined });

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('relies on SAML logout if query string is not empty, but does not include SAMLRequest.', async () => {
      const request = requestFixture({ search: '?Whatever=something%20unrelated' });
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      callWithInternalUser.withArgs('shield.samlLogout').resolves({ redirect: null });

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('relies on SAML invalidate call even if access token is presented.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      callWithInternalUser.withArgs('shield.samlInvalidate').resolves({ redirect: null });

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken: 'x-saml-token',
        refreshToken: 'x-saml-refresh-token',
      });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlInvalidate', {
        body: {
          queryString: 'SAMLRequest=xxx%20yyy',
          realm: 'test-realm',
        },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML invalidate response is null.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      callWithInternalUser.withArgs('shield.samlInvalidate').resolves({ redirect: null });

      const authenticationResult = await provider.deauthenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlInvalidate', {
        body: {
          queryString: 'SAMLRequest=xxx%20yyy',
          realm: 'test-realm',
        },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML invalidate response is not defined.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      callWithInternalUser.withArgs('shield.samlInvalidate').resolves({ redirect: undefined });

      const authenticationResult = await provider.deauthenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.samlInvalidate', {
        body: {
          queryString: 'SAMLRequest=xxx%20yyy',
          realm: 'test-realm',
        },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of SP initiated logout.', async () => {
      const request = requestFixture();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      callWithInternalUser
        .withArgs('shield.samlLogout')
        .resolves({ redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H' });

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('http://fake-idp/SLO?SAMLRequest=7zlH37H');
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of IdP initiated logout.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      callWithInternalUser
        .withArgs('shield.samlInvalidate')
        .resolves({ redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H' });

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken: 'x-saml-token',
        refreshToken: 'x-saml-refresh-token',
      });

      sinon.assert.calledOnce(callWithInternalUser);
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('http://fake-idp/SLO?SAMLRequest=7zlH37H');
    });
  });
});
