/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import Boom from 'boom';
import { LoginAttempt } from '../login_attempt';

import { mockAuthenticationProviderOptions } from './base.mock';
import { requestFixture } from '../../__tests__/__fixtures__/request';

import { OIDCAuthenticationProvider } from './oidc';

describe('OIDCAuthenticationProvider', () => {
  let provider: OIDCAuthenticationProvider;
  let callWithRequest: sinon.SinonStub;
  let callWithInternalUser: sinon.SinonStub;
  beforeEach(() => {
    const providerOptions = mockAuthenticationProviderOptions({ basePath: '/test-base-path' });
    const providerSpecificOptions = { realm: 'oidc1' };
    callWithRequest = providerOptions.client.callWithRequest as sinon.SinonStub;
    callWithInternalUser = providerOptions.client.callWithInternalUser as sinon.SinonStub;

    provider = new OIDCAuthenticationProvider(providerOptions, providerSpecificOptions);
  });

  it('throws if `realm` option is not specified', () => {
    const providerOptions = mockAuthenticationProviderOptions({ basePath: '/test-base-path' });

    expect(() => new OIDCAuthenticationProvider(providerOptions)).toThrowError(
      'Realm name must be specified'
    );
    expect(() => new OIDCAuthenticationProvider(providerOptions, {})).toThrowError(
      'Realm name must be specified'
    );
    expect(() => new OIDCAuthenticationProvider(providerOptions, { realm: '' })).toThrowError(
      'Realm name must be specified'
    );
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      const authenticationResult = await provider.authenticate(request, null);

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
      sinon.assert.notCalled(callWithInternalUser);
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('redirects non-AJAX request that can not be authenticated to the OpenId Connect Provider.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser.withArgs('shield.oidcPrepare').resolves({
        state: 'statevalue',
        nonce: 'noncevalue',
        redirect:
          'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc',
      });

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.oidcPrepare', {
        body: { realm: `oidc1` },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc'
      );
      expect(authenticationResult.state).toEqual({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: `/s/foo/some-path`,
      });
    });

    it('redirects third party initiated authentications to the OpenId Connect Provider.', async () => {
      const request = requestFixture({
        path: '/api/security/v1/oidc',
        search: '?iss=theissuer&login_hint=loginhint',
        basePath: '/s/foo',
      });

      callWithInternalUser.withArgs('shield.oidcPrepare').resolves({
        state: 'statevalue',
        nonce: 'noncevalue',
        redirect:
          'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc' +
          '&login_hint=loginhint',
      });

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.oidcPrepare', {
        body: { iss: `theissuer`, login_hint: `loginhint` },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc' +
          '&login_hint=loginhint'
      );
      expect(authenticationResult.state).toEqual({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: `/s/foo/`,
      });
    });

    it('fails if OpenID Connect authentication request preparation fails.', async () => {
      const request = requestFixture({ path: '/some-path' });

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser.withArgs('shield.oidcPrepare').returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.oidcPrepare', {
        body: { realm: `oidc1` },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('gets token and redirects user to requested URL if OIDC authentication response is valid.', async () => {
      const request = requestFixture({
        path: '/api/security/v1/oidc?code=somecodehere&state=somestatehere',
        search: '?code=somecodehere&state=somestatehere',
      });

      callWithInternalUser
        .withArgs('shield.oidcAuthenticate')
        .resolves({ access_token: 'some-token', refresh_token: 'some-refresh-token' });

      const authenticationResult = await provider.authenticate(request, {
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: '/test-base-path/some-path',
      });

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.oidcAuthenticate', {
        body: {
          state: 'statevalue',
          nonce: 'noncevalue',
          redirect_uri: '/api/security/v1/oidc?code=somecodehere&state=somestatehere',
        },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/test-base-path/some-path');
      expect(authenticationResult.state).toEqual({
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
      });
    });

    it('fails if authentication response is presented but session state does not contain the state parameter.', async () => {
      const request = requestFixture({
        path: '/api/security/v1/oidc',
        search: '?code=somecodehere&state=somestatehere',
      });

      const authenticationResult = await provider.authenticate(request, {
        nextURL: '/test-base-path/some-path',
      });

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest(
          'Response session state does not have corresponding state or nonce parameters or redirect URL.'
        )
      );
    });

    it('fails if authentication response is presented but session state does not contain redirect URL.', async () => {
      const request = requestFixture({
        path: '/api/security/v1/oidc',
        search: '?code=somecodehere&state=somestatehere',
      });

      const authenticationResult = await provider.authenticate(request, {
        state: 'statevalue',
        nonce: 'noncevalue',
      });

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest(
          'Response session state does not have corresponding state or nonce parameters or redirect URL.'
        )
      );
    });

    it('fails if session state is not presented.', async () => {
      const request = requestFixture({
        path: '/api/security/v1/oidc?code=somecodehere&state=somestatehere',
        search: '?code=somecodehere&state=somestatehere',
      });

      const authenticationResult = await provider.authenticate(request, {});

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).toBe(true);
    });

    it('fails if code is invalid.', async () => {
      const request = requestFixture({
        path: '/api/security/v1/oidc?code=somecodehere&state=somestatehere',
        search: '?code=somecodehere&state=somestatehere',
      });

      const failureReason = new Error(
        'Failed to exchange code for Id Token using the Token Endpoint.'
      );
      callWithInternalUser
        .withArgs('shield.oidcAuthenticate')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request, {
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: '/test-base-path/some-path',
      });

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.oidcAuthenticate', {
        body: {
          state: 'statevalue',
          nonce: 'noncevalue',
          redirect_uri: '/api/security/v1/oidc?code=somecodehere&state=somestatehere',
        },
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
      expect(authenticationResult.state).toBe(undefined);
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

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = requestFixture();

      const failureReason = new Error('Token is not valid!');
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.reject(failureReason));

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

    it('fails if token from the state is expired and refresh attempt failed too.', async () => {
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
        .returns(Promise.reject(refreshFailureReason));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
      });

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(refreshFailureReason);
    });

    it('redirects to OpenID Connect Provider for non-AJAX requests if refresh token is expired or already refreshed.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser.withArgs('shield.oidcPrepare').resolves({
        state: 'statevalue',
        nonce: 'noncevalue',
        redirect:
          'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc',
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

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.oidcPrepare', {
        body: { realm: `oidc1` },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc'
      );
      expect(authenticationResult.state).toEqual({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: `/s/foo/some-path`,
      });
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
        Boom.badRequest('Both elasticsearch access and refresh tokens are expired.')
      );
    });

    it('succeeds if `authorization` contains a valid token.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Bearer some-valid-token' } });

      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(request.headers.authorization).toBe('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBe(undefined);
    });

    it('fails if token from `authorization` header is rejected.', async () => {
      const request = requestFixture({ headers: { authorization: 'Bearer some-invalid-token' } });

      const failureReason = new Error('Token is not valid!');
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails if token from `authorization` header is rejected even if state contains a valid one.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Bearer some-invalid-token' } });

      const failureReason = new Error('Token is not valid!');
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.reject(failureReason));

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
  });

  describe('`deauthenticate` method', () => {
    it('returns `notHandled` if state is not presented or does not include access token.', async () => {
      const request = requestFixture();

      let deauthenticateResult = await provider.deauthenticate(request, {});
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.deauthenticate(request, {});
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.deauthenticate(request, { nonce: 'x' });
      expect(deauthenticateResult.notHandled()).toBe(true);

      sinon.assert.notCalled(callWithInternalUser);
    });

    it('fails if OpenID Connect logout call fails.', async () => {
      const request = requestFixture();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser.withArgs('shield.oidcLogout').returns(Promise.reject(failureReason));

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.oidcLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to /logged_out if `redirect` field in OpenID Connect logout response is null.', async () => {
      const request = requestFixture();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      callWithInternalUser.withArgs('shield.oidcLogout').resolves({ redirect: null });

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.oidcLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/test-base-path/logged_out');
    });

    it('redirects user to the OpenID Connect Provider if RP initiated SLO is supported.', async () => {
      const request = requestFixture();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      callWithInternalUser
        .withArgs('shield.oidcLogout')
        .resolves({ redirect: 'http://fake-idp/logout&id_token_hint=thehint' });

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('http://fake-idp/logout&id_token_hint=thehint');
    });
  });
});
