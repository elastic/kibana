/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@commercial/boom';
import expect from 'expect.js';
import sinon from 'sinon';

import { requestFixture } from '../../../__tests__/__fixtures__/request';

import { SAMLAuthenticationProvider } from '../saml';

describe('SAMLAuthenticationProvider', () => {
  let provider;
  let callWithRequest;
  let callWithInternalUser;
  beforeEach(() => {
    callWithRequest = sinon.stub();
    callWithInternalUser = sinon.stub();

    provider = new SAMLAuthenticationProvider({
      client: { callWithRequest, callWithInternalUser },
      log() {},
      protocol: 'test-protocol',
      hostname: 'test-hostname',
      port: 1234,
      basePath: '/test-base-path'
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).to.be(true);
    });

    it('redirects non-AJAX request that can not be authenticated to the IdP.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser
        .withArgs('shield.samlPrepare')
        .returns(Promise.resolve({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20'
        }));

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlPrepare',
        { body: { acs: `test-protocol://test-hostname:1234/test-base-path/api/security/v1/saml` } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('https://idp-host/path/login?SAMLRequest=some%20request%20');
      expect(authenticationResult.state).to.eql({
        requestId: 'some-request-id',
        nextURL: `/s/foo/some-path`
      });
    });

    it('fails if SAML request preparation fails.', async () => {
      const request = requestFixture({ path: '/some-path' });

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser
        .withArgs('shield.samlPrepare')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlPrepare',
        { body: { acs: `test-protocol://test-hostname:1234/test-base-path/api/security/v1/saml` } }
      );

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
    });

    it('gets token and redirects user to requested URL if SAML Response is valid.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      callWithInternalUser
        .withArgs('shield.samlAuthenticate')
        .returns(Promise.resolve({ access_token: 'some-token', refresh_token: 'some-refresh-token' }));

      const authenticationResult = await provider.authenticate(request, {
        requestId: 'some-request-id',
        nextURL: '/test-base-path/some-path'
      });

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml' } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/some-path');
      expect(authenticationResult.state).to.eql({ accessToken: 'some-token', refreshToken: 'some-refresh-token' });
    });

    it('gets token and redirects user to the requested URL if SAML Response is valid ignoring Relay State.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      callWithInternalUser
        .withArgs('shield.samlAuthenticate')
        .returns(Promise.resolve({ access_token: 'some-token', refresh_token: 'some-refresh-token' }));

      provider = new SAMLAuthenticationProvider({
        client: { callWithRequest, callWithInternalUser },
        log() {},
        protocol: 'test-protocol',
        hostname: 'test-hostname',
        port: 1234,
        basePath: '/test-base-path'
      }, { useRelayStateDeepLink: true });

      const authenticationResult = await provider.authenticate(request, {
        requestId: 'some-request-id',
        nextURL: '/test-base-path/some-path'
      });

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml' } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/some-path');
      expect(authenticationResult.state).to.eql({ accessToken: 'some-token', refreshToken: 'some-refresh-token' });
    });

    it('fails if SAML Response payload is presented but state does not contain SAML Request token.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      const authenticationResult = await provider.authenticate(request, {
        nextURL: '/test-base-path/some-path'
      });

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.eql(
        Boom.badRequest('SAML response state does not have corresponding request id or redirect URL.')
      );
    });

    it('fails if SAML Response payload is presented but state does not contain redirect URL.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      const authenticationResult = await provider.authenticate(request, {
        requestId: 'some-request-id'
      });

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.eql(
        Boom.badRequest('SAML response state does not have corresponding request id or redirect URL.')
      );
    });

    it('redirects to the default location if state is not presented.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      callWithInternalUser
        .withArgs('shield.samlAuthenticate')
        .returns(Promise.resolve({
          access_token: 'idp-initiated-login-token',
          refresh_token: 'idp-initiated-login-refresh-token'
        }));

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlAuthenticate',
        { body: { ids: [], content: 'saml-response-xml' } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/');
      expect(authenticationResult.state).to.eql({
        accessToken: 'idp-initiated-login-token',
        refreshToken: 'idp-initiated-login-refresh-token'
      });
    });

    describe('IdP initiated login', () => {
      beforeEach(() => {
        provider = new SAMLAuthenticationProvider({
          client: { callWithRequest, callWithInternalUser },
          log() {},
          protocol: 'test-protocol',
          hostname: 'test-hostname',
          port: 1234,
          basePath: '/test-base-path'
        }, { useRelayStateDeepLink: true });

        callWithInternalUser
          .withArgs('shield.samlAuthenticate')
          .returns(Promise.resolve({ access_token: 'some-token', refresh_token: 'some-refresh-token' }));
      });

      it('redirects to the home page if `useRelayStateDeepLink` is set to `false`.', async () => {
        provider = new SAMLAuthenticationProvider({
          client: { callWithRequest, callWithInternalUser },
          log() {},
          protocol: 'test-protocol',
          hostname: 'test-hostname',
          port: 1234,
          basePath: '/test-base-path'
        }, { useRelayStateDeepLink: false });

        const authenticationResult = await provider.authenticate(
          requestFixture({ payload: { SAMLResponse: 'saml-response-xml', RelayState: '/test-base-path/app/some-app#some-deep-link' } })
        );

        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.samlAuthenticate',
          { body: { ids: [], content: 'saml-response-xml' } }
        );

        expect(authenticationResult.redirected()).to.be(true);
        expect(authenticationResult.redirectURL).to.be('/test-base-path/');
        expect(authenticationResult.state).to.eql({ accessToken: 'some-token', refreshToken: 'some-refresh-token' });
      });

      it('redirects to the home page if `RelayState` is not specified.', async () => {
        const authenticationResult = await provider.authenticate(
          requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } })
        );

        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.samlAuthenticate',
          { body: { ids: [], content: 'saml-response-xml' } }
        );

        expect(authenticationResult.redirected()).to.be(true);
        expect(authenticationResult.redirectURL).to.be('/test-base-path/');
        expect(authenticationResult.state).to.eql({ accessToken: 'some-token', refreshToken: 'some-refresh-token' });
      });

      it('redirects to the home page if `RelayState` includes external URL', async () => {
        const authenticationResult = await provider.authenticate(
          requestFixture({ payload: { SAMLResponse: 'saml-response-xml', RelayState: 'https://evil.com/test-base-path/app/some-app#some-deep-link' } })
        );

        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.samlAuthenticate',
          { body: { ids: [], content: 'saml-response-xml' } }
        );

        expect(authenticationResult.redirected()).to.be(true);
        expect(authenticationResult.redirectURL).to.be('/test-base-path/');
        expect(authenticationResult.state).to.eql({ accessToken: 'some-token', refreshToken: 'some-refresh-token' });
      });

      it('redirects to the home page if `RelayState` includes URL that starts with double slashes', async () => {
        const authenticationResult = await provider.authenticate(
          requestFixture({ payload: { SAMLResponse: 'saml-response-xml', RelayState: '//test-base-path/app/some-app#some-deep-link' } })
        );

        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.samlAuthenticate',
          { body: { ids: [], content: 'saml-response-xml' } }
        );

        expect(authenticationResult.redirected()).to.be(true);
        expect(authenticationResult.redirectURL).to.be('/test-base-path/');
        expect(authenticationResult.state).to.eql({ accessToken: 'some-token', refreshToken: 'some-refresh-token' });
      });

      it('redirects to the URL from the relay state.', async () => {
        const authenticationResult = await provider.authenticate(
          requestFixture({ payload: { SAMLResponse: 'saml-response-xml', RelayState: '/test-base-path/app/some-app#some-deep-link' } })
        );

        sinon.assert.calledWithExactly(
          callWithInternalUser,
          'shield.samlAuthenticate',
          { body: { ids: [], content: 'saml-response-xml' } }
        );

        expect(authenticationResult.redirected()).to.be(true);
        expect(authenticationResult.redirectURL).to.be('/test-base-path/app/some-app#some-deep-link');
        expect(authenticationResult.state).to.eql({ accessToken: 'some-token', refreshToken: 'some-refresh-token' });
      });
    });

    it('fails if SAML Response is rejected.', async () => {
      const request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });

      const failureReason = new Error('SAML response is stale!');
      callWithInternalUser
        .withArgs('shield.samlAuthenticate')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request, {
        requestId: 'some-request-id',
        nextURL: '/test-base-path/some-path'
      });

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml' } }
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

      const failureReason = { statusCode: 500, message: 'Token is not valid!' };
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

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
        .rejects({ statusCode: 401 });

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

    it('fails for AJAX requests with user friendly message if refresh token is expired.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      callWithInternalUser
        .withArgs(
          'shield.getAccessToken',
          { body: { grant_type: 'refresh_token', refresh_token: 'expired-refresh-token' } }
        )
        .rejects({ statusCode: 400 });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token'
      });

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.eql(Boom.badRequest('Both access and refresh tokens are expired.'));
    });

    it('initiates SAML handshake for non-AJAX requests if access token document is missing.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser
        .withArgs('shield.samlPrepare')
        .returns(Promise.resolve({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20'
        }));

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
        .withArgs(
          'shield.getAccessToken',
          { body: { grant_type: 'refresh_token', refresh_token: 'expired-refresh-token' } }
        )
        .rejects({ statusCode: 400 });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token'
      });

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlPrepare',
        { body: { acs: `test-protocol://test-hostname:1234/test-base-path/api/security/v1/saml` } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('https://idp-host/path/login?SAMLRequest=some%20request%20');
      expect(authenticationResult.state).to.eql({
        requestId: 'some-request-id',
        nextURL: `/s/foo/some-path`
      });
    });

    it('initiates SAML handshake for non-AJAX requests if refresh token is expired.', async () => {
      const request = requestFixture({ path: '/some-path', basePath: '/s/foo' });

      callWithInternalUser
        .withArgs('shield.samlPrepare')
        .returns(Promise.resolve({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20'
        }));

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      callWithInternalUser
        .withArgs(
          'shield.getAccessToken',
          { body: { grant_type: 'refresh_token', refresh_token: 'expired-refresh-token' } }
        )
        .rejects({ statusCode: 400 });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token'
      });

      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlPrepare',
        { body: { acs: `test-protocol://test-hostname:1234/test-base-path/api/security/v1/saml` } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('https://idp-host/path/login?SAMLRequest=some%20request%20');
      expect(authenticationResult.state).to.eql({
        requestId: 'some-request-id',
        nextURL: `/s/foo/some-path`
      });
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

      const failureReason = { statusCode: 401 };
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

      const failureReason = { statusCode: 401 };
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

    it('fails if SAML logout call fails.', async () => {
      const request = requestFixture();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser
        .withArgs('shield.samlLogout')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlLogout',
        { body: { token: accessToken, refresh_token: refreshToken } }
      );

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
    });

    it('fails if SAML invalidate call fails.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      const failureReason = new Error('Realm is misconfigured!');
      callWithInternalUser
        .withArgs('shield.samlInvalidate')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.deauthenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlInvalidate',
        {
          body: {
            queryString: 'SAMLRequest=xxx%20yyy',
            acs: 'test-protocol://test-hostname:1234/test-base-path/api/security/v1/saml'
          }
        }
      );

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
    });

    it('redirects to /logged_out if `redirect` field in SAML logout response is null.', async () => {
      const request = requestFixture();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      callWithInternalUser
        .withArgs('shield.samlLogout')
        .returns(Promise.resolve({ redirect: null }));

      const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlLogout',
        { body: { token: accessToken, refresh_token: refreshToken } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML logout response is not defined.', async () => {
      const request = requestFixture();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      callWithInternalUser
        .withArgs('shield.samlLogout')
        .returns(Promise.resolve({ redirect: undefined }));

      const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlLogout',
        { body: { token: accessToken, refresh_token: refreshToken } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/logged_out');
    });

    it('relies on SAML logout if query string is not empty, but does not include SAMLRequest.', async () => {
      const request = requestFixture({ search: '?Whatever=something%20unrelated&SAMLResponse=xxx%20yyy' });
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      callWithInternalUser
        .withArgs('shield.samlLogout')
        .returns(Promise.resolve({ redirect: null }));

      const authenticationResult = await provider.deauthenticate(request, { accessToken, refreshToken });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlLogout',
        { body: { token: accessToken, refresh_token: refreshToken } }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/logged_out');
    });

    it('relies SAML invalidate call even if access token is presented.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      callWithInternalUser
        .withArgs('shield.samlInvalidate')
        .returns(Promise.resolve({ redirect: null }));

      const authenticationResult = await provider.deauthenticate(
        request,
        { accessToken: 'x-saml-token', refreshToken: 'x-saml-refresh-token' }
      );

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlInvalidate',
        {
          body: {
            queryString: 'SAMLRequest=xxx%20yyy',
            acs: 'test-protocol://test-hostname:1234/test-base-path/api/security/v1/saml'
          }
        }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML invalidate response is null.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      callWithInternalUser
        .withArgs('shield.samlInvalidate')
        .returns(Promise.resolve({ redirect: null }));

      const authenticationResult = await provider.deauthenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlInvalidate',
        {
          body: {
            queryString: 'SAMLRequest=xxx%20yyy',
            acs: 'test-protocol://test-hostname:1234/test-base-path/api/security/v1/saml'
          }
        }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML invalidate response is not defined.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      callWithInternalUser
        .withArgs('shield.samlInvalidate')
        .returns(Promise.resolve({ redirect: undefined }));

      const authenticationResult = await provider.deauthenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(
        callWithInternalUser,
        'shield.samlInvalidate',
        {
          body: {
            queryString: 'SAMLRequest=xxx%20yyy',
            acs: 'test-protocol://test-hostname:1234/test-base-path/api/security/v1/saml'
          }
        }
      );

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/logged_out');
    });

    it('redirects to /logged_out if SAML logout response is received.', async () => {
      const request = requestFixture({ search: '?SAMLResponse=xxx%20yyy' });

      const authenticationResult = await provider.deauthenticate(request);

      sinon.assert.notCalled(callWithInternalUser);

      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('/test-base-path/logged_out');
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of SP initiated logout.', async () => {
      const request = requestFixture();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      callWithInternalUser
        .withArgs('shield.samlLogout')
        .returns(Promise.resolve({ redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H' }));

      const authenticationResult = await provider.deauthenticate(
        request,
        { accessToken, refreshToken }
      );

      sinon.assert.calledOnce(callWithInternalUser);
      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('http://fake-idp/SLO?SAMLRequest=7zlH37H');
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of IdP initiated logout.', async () => {
      const request = requestFixture({ search: '?SAMLRequest=xxx%20yyy' });

      callWithInternalUser
        .withArgs('shield.samlInvalidate')
        .returns(Promise.resolve({ redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H' }));

      const authenticationResult = await provider.deauthenticate(
        request,
        { accessToken: 'x-saml-token', refreshToken: 'x-saml-refresh-token' }
      );

      sinon.assert.calledOnce(callWithInternalUser);
      expect(authenticationResult.redirected()).to.be(true);
      expect(authenticationResult.redirectURL).to.be('http://fake-idp/SLO?SAMLRequest=7zlH37H');
    });
  });
});
