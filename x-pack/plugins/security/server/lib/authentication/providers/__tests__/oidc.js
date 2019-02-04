/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from "expect.js";
import sinon from 'sinon';
import { OpenIdConnectAuthenticationProvider } from '../oidc';
import { requestFixture } from '../../../__tests__/__fixtures__/request';
import Boom from 'boom';

describe('OpenIdConnectAuthenticationProvider', () => {
  let provider;
  let callWithRequest;
  let callWithInternalUser;
  beforeEach(() => {
    callWithRequest = sinon.stub();
    callWithInternalUser = sinon.stub();

    provider = new OpenIdConnectAuthenticationProvider({
      client: { callWithRequest, callWithInternalUser },
      log() {},
      realm: 'oidc1',
      basePath: '/test-base-path'
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).to.be(true);
    });

    it('redirects non-AJAX request that can not be authenticated to the OpenId Connect Provider.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser
        .withArgs('shield.oidcPrepare')
        .returns(Promise.resolve({
          state: 'statevalue',
          nonce: 'noncevalue',
          redirect: 'https://op-host/path/login?response_type=code' +
                    '&scope=openid%20profile%20email' +
                    '&client_id=s6BhdRkqt3' +
                    '&state=statevalue' +
                    '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc'
        }));

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.oidcPrepare',
        { body: { realm: `oidc1` } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('https://op-host/path/login?response_type=code' +
        '&scope=openid%20profile%20email' +
        '&client_id=s6BhdRkqt3' +
        '&state=statevalue' +
        '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc');
      expect(authenticationResult.state).to.eql({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: `/s/foo/some-path`
      });
    });

    it('redirects third party initiated authentications to the OpenId Connect Provider.', async () => {
      const request = requestFixture({ path: '/api/security/v1/oidc', search: '?iss=theissuer', basePath: '/s/foo' });

      callWithInternalUser
        .withArgs('shield.oidcPrepare')
        .returns(Promise.resolve({
          state: 'statevalue',
          nonce: 'noncevalue',
          redirect: 'https://op-host/path/login?response_type=code' +
            '&scope=openid%20profile%20email' +
            '&client_id=s6BhdRkqt3' +
            '&state=statevalue' +
            '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc'
        }));

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.oidcPrepare',
        { body: { iss: `theissuer` } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('https://op-host/path/login?response_type=code' +
        '&scope=openid%20profile%20email' +
        '&client_id=s6BhdRkqt3' +
        '&state=statevalue' +
        '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc');
      expect(authenticationResult.state).to.eql({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: `/s/foo`
      });
    });

    it('fails if OpenID Connect authentication request preparation fails.', async () => {
      const request = requestFixture({ path: '/some-path' });

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser
        .withArgs('shield.oidcPrepare')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.oidcPrepare',
        { body: { realm: `oidc1` } }
      );

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
    });

    it('gets token and redirects user to requested URL if OIDC authentication response is valid.', async () => {
      const request = requestFixture({ path: '/api/security/v1/oidc?code=somecodehere&state=somestatehere',
        search: '?code=somecodehere&state=somestatehere' });

      callWithInternalUser
        .withArgs('shield.oidcAuthenticate')
        .returns(Promise.resolve({ access_token: 'some-token', refresh_token: 'some-refresh-token' }));

      const authenticationResult = await provider.authenticate(request, {
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: '/test-base-path/some-path'
      });

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.oidcAuthenticate',
        { body: { state: 'statevalue', nonce: 'noncevalue', redirect_uri: '/api/security/v1/oidc?code=somecodehere&state=somestatehere' } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/some-path');
      expect(authenticationResult.state).to.eql({ accessToken: 'some-token', refreshToken: 'some-refresh-token' });
    });

    it('fails if authentication response is presented but session state does not contain the state parameter.', async () => {
      const request = requestFixture({ path: '/api/security/v1/oidc', search: '?code=somecodehere&state=somestatehere' });

      const authenticationResult = await provider.authenticate(request, {
        nextURL: '/test-base-path/some-path'
      });

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.eql(
        Boom.badRequest('Response session state does not have corresponding state or nonce parameters or redirect URL.')
      );
    });

    it('fails if authentication response is presented but session state does not contain redirect URL.', async () => {
      const request = requestFixture({ path: '/api/security/v1/oidc', search: '?code=somecodehere&state=somestatehere' });

      const authenticationResult = await provider.authenticate(request, {
        state: 'statevalue',
        nonce: 'noncevalue',
      });

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.eql(
        Boom.badRequest('Response session state does not have corresponding state or nonce parameters or redirect URL.')
      );
    });

    it('fails if session state is not presented.', async () => {
      const request = requestFixture({ path: '/api/security/v1/oidc?code=somecodehere&state=somestatehere',
        search: '?code=somecodehere&state=somestatehere' });

      const authenticationResult = await provider.authenticate(request, {});

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).to.be(true);
    });

    it('fails if code is invalid.', async () => {
      const request = requestFixture({ path: '/api/security/v1/oidc?code=somecodehere&state=somestatehere',
        search: '?code=somecodehere&state=somestatehere' });

      const failureReason = new Error('Failed to exchange code for Id Token using the Token Endpoint.');
      callWithInternalUser
        .withArgs('shield.oidcAuthenticate')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request, {
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: '/test-base-path/some-path'
      });

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.oidcAuthenticate',
        { body: { state: 'statevalue', nonce: 'noncevalue', redirect_uri: '/api/security/v1/oidc?code=somecodehere&state=somestatehere' } }
      );

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = { username: 'user' };
      const request = requestFixture();

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token'
      });

      expect(request.headers.authorization).to.be('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be(user);
      expect(authenticationResult.state).to.be(undefined);
    });

    it('does not handle `authorization` header with unsupported schema even if state contains a valid token.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic some:credentials' } });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token'
      });

      sinon.assert.notCalled(callWithRequest);
      expect(request.headers.authorization).to.be('Basic some:credentials');
      expect(authenticationResult.notHandled()).to.be(true);
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = requestFixture();

      const failureReason = new Error('Token is not valid!');
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-invalid-token',
        refreshToken: 'some-invalid-refresh-token'
      });

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
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
        .returns(Promise.reject({ body: { error: { reason: 'token expired' } } }));

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer new-access-token' } }),
          'shield.authenticate'
        )
        .returns(Promise.resolve(user));

      callWithInternalUser
        .withArgs(
          'shield.getAccessToken',
          { body: { grant_type: 'refresh_token', refresh_token: 'valid-refresh-token' } }
        )
        .returns(Promise.resolve({ access_token: 'new-access-token', refresh_token: 'new-refresh-token' }));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token'
      });

      expect(request.headers.authorization).to.be('Bearer new-access-token');
      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be(user);
      expect(authenticationResult.state).to.eql({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });
    });

    it('fails if token from the state is expired and refresh attempt failed too.', async () => {
      const request = requestFixture();

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .returns(Promise.reject({ body: { error: { reason: 'token expired' } } }));

      const refreshFailureReason = new Error('Something is wrong with refresh token.');
      callWithInternalUser
        .withArgs(
          'shield.getAccessToken',
          { body: { grant_type: 'refresh_token', refresh_token: 'invalid-refresh-token' } }
        )
        .returns(Promise.reject(refreshFailureReason));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token'
      });

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(refreshFailureReason);
    });

    it('fails for AJAX requests with user friendly message if refresh token is used more than once.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .returns(Promise.reject({ body: { error: { reason: 'token expired' } } }));

      callWithInternalUser
        .withArgs(
          'shield.getAccessToken',
          { body: { grant_type: 'refresh_token', refresh_token: 'invalid-refresh-token' } }
        )
        .returns(Promise.reject({ body: { error_description: 'token has already been refreshed' } }));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token'
      });

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.eql(Boom.badRequest('Both access and refresh tokens are expired.'));
    });

    it('redirects to OpenID Connect Provider for non-AJAX requests if refresh token is used more than once.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser
        .withArgs('shield.oidcPrepare')
        .returns(Promise.resolve({
          state: 'statevalue',
          nonce: 'noncevalue',
          redirect: 'https://op-host/path/login?response_type=code' +
            '&scope=openid%20profile%20email' +
            '&client_id=s6BhdRkqt3' +
            '&state=statevalue' +
            '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc'
        }));

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .returns(Promise.reject({ body: { error: { reason: 'token expired' } } }));

      callWithInternalUser
        .withArgs(
          'shield.getAccessToken',
          { body: { grant_type: 'refresh_token', refresh_token: 'invalid-refresh-token' } }
        )
        .returns(Promise.reject({ body: { error_description: 'token has already been refreshed' } }));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token'
      });

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.oidcPrepare',
        { body: { realm: `oidc1` } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('https://op-host/path/login?response_type=code' +
        '&scope=openid%20profile%20email' +
        '&client_id=s6BhdRkqt3' +
        '&state=statevalue' +
        '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc');
      expect(authenticationResult.state).to.eql({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: `/s/foo/some-path`
      });
    });

    it('redirects to OpenID Connect Provider for non-AJAX requests if refresh token is expired.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser
        .withArgs('shield.oidcPrepare')
        .returns(Promise.resolve({
          state: 'statevalue',
          nonce: 'noncevalue',
          redirect: 'https://op-host/path/login?response_type=code' +
            '&scope=openid%20profile%20email' +
            '&client_id=s6BhdRkqt3' +
            '&state=statevalue' +
            '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc'
        }));

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .returns(Promise.reject({ body: { error: { reason: 'token expired' } } }));

      callWithInternalUser
        .withArgs(
          'shield.getAccessToken',
          { body: { grant_type: 'refresh_token', refresh_token: 'expired-refresh-token' } }
        )
        .returns(Promise.reject({ body: { error_description: 'refresh token is expired' } }));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token'
      });

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.oidcPrepare',
        { body: { realm: `oidc1` } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('https://op-host/path/login?response_type=code' +
        '&scope=openid%20profile%20email' +
        '&client_id=s6BhdRkqt3' +
        '&state=statevalue' +
        '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc');
      expect(authenticationResult.state).to.eql({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: `/s/foo/some-path`
      });
    });

    it('fails for AJAX requests with user friendly message if refresh token is expired.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .returns(Promise.reject({ body: { error: { reason: 'token expired' } } }));

      callWithInternalUser
        .withArgs(
          'shield.getAccessToken',
          { body: { grant_type: 'refresh_token', refresh_token: 'expired-refresh-token' } }
        )
        .returns(Promise.reject({ body: { error_description: 'refresh token is expired' } }));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token'
      });

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.eql(Boom.badRequest('Both access and refresh tokens are expired.'));
    });

    it('succeeds if `authorization` contains a valid token.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Bearer some-valid-token' } });

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request);

      expect(request.headers.authorization).to.be('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be(user);
      expect(authenticationResult.state).to.be(undefined);
    });

    it('fails if token from `authorization` header is rejected.', async () => {
      const request = requestFixture({ headers: { authorization: 'Bearer some-invalid-token' } });

      const failureReason = new Error('Token is not valid!');
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
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
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token'
      });

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
    });
  });

  describe('`deauthenticate` method', () => {
    it('returns `notHandled` if state is not presented or does not include access token.', async () => {
      const request = requestFixture();

      let deauthenticateResult = await provider.deauthenticate(request);
      expect(deauthenticateResult.notHandled()).to.be(true);

      deauthenticateResult = await provider.deauthenticate(request, {});
      expect(deauthenticateResult.notHandled()).to.be(true);

      deauthenticateResult = await provider.deauthenticate(request, { somethingElse: 'x' });
      expect(deauthenticateResult.notHandled()).to.be(true);

      sinon.assert.notCalled(callWithInternalUser);
    });

    it('fails if OpenID Connect logout call fails.', async () => {
      const request = requestFixture();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser
        .withArgs('shield.oidcLogout')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.oidcLogout',
        { body: { token: accessToken, refresh_token: refreshToken } }
      );

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
    });

    it('redirects to /logged_out if `redirect` field in OpenID Connect logout response is null.', async () => {
      const request = requestFixture();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      callWithInternalUser
        .withArgs('shield.oidcLogout')
        .returns(Promise.resolve({ redirect: null }));

      const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.oidcLogout',
        { body: { token: accessToken, refresh_token: refreshToken } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/logged_out');
    });

    it('redirects user to the OpenID Connect Provider if RP initiated SLO is supported.', async () => {
      const request = requestFixture();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      callWithInternalUser
        .withArgs('shield.oidcLogout')
        .returns(Promise.resolve({ redirect: 'http://fake-idp/logout&id_token_hint=thehint' }));

      const authenticationResult = await provider.deauthenticate(
        request,
        { accessToken, refreshToken }
      );

      sinon.assert.calledOnce(callWithInternalUser);
      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('http://fake-idp/logout&id_token_hint=thehint');
    });
  });
});
