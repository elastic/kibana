/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { requestFixture } from '../../../__tests__/__fixtures__/request';
import { LoginAttempt } from '../../login_attempt';
import { BasicAuthenticationProvider, BasicCredentials } from '../basic';

function generateAuthorizationHeader(username, password) {
  const { headers: { authorization } } = BasicCredentials.decorateRequest(
    requestFixture(), username, password
  );

  return authorization;
}

describe('BasicAuthenticationProvider', () => {
  describe('`authenticate` method', () => {
    let provider;
    let callWithRequest;
    beforeEach(() => {
      callWithRequest = sinon.stub();
      provider = new BasicAuthenticationProvider({
        client: { callWithRequest },
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

    it('does not handle authentication if state exists, but authorization property is missing.',
      async () => {
        const authenticationResult = await provider.authenticate(
          requestFixture(),
          {}
        );

        expect(authenticationResult.notHandled()).to.be(true);
      });

    it('succeeds with valid login attempt and stores in session', async () => {
      const user = { username: 'user' };
      const authorization = generateAuthorizationHeader('user', 'password');
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      request.loginAttempt.returns(loginAttempt);

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql(user);
      expect(authenticationResult.state).to.be.eql({ authorization });
      sinon.assert.calledOnce(callWithRequest);
    });

    it('succeeds if only `authorization` header is available.', async () => {
      const request = BasicCredentials.decorateRequest(requestFixture(), 'user', 'password');
      const user = { username: 'user' };

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql(user);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('does not return session state for header-based auth', async () => {
      const request = BasicCredentials.decorateRequest(requestFixture(), 'user', 'password');
      const user = { username: 'user' };

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.state).not.to.eql({ authorization: request.headers.authorization });
    });

    it('succeeds if only state is available.', async () => {
      const request = requestFixture();
      const user = { username: 'user' };
      const authorization = generateAuthorizationHeader('user', 'password');

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request, { authorization });

      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql(user);
      expect(authenticationResult.state).to.be.eql(undefined);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('does not handle `authorization` header with unsupported schema even if state contains valid credentials.', async () => {
      const request = requestFixture({ headers: { authorization: 'Bearer ***' } });
      const authorization = generateAuthorizationHeader('user', 'password');

      const authenticationResult = await provider.authenticate(request, { authorization });

      sinon.assert.notCalled(callWithRequest);
      expect(request.headers.authorization).to.be('Bearer ***');
      expect(authenticationResult.notHandled()).to.be(true);
    });

    it('fails if state contains invalid credentials.', async () => {
      const request = requestFixture();
      const authorization = generateAuthorizationHeader('user', 'password');

      const authenticationError = new Error('Forbidden');
      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .returns(Promise.reject(authenticationError));

      const authenticationResult = await provider.authenticate(request, { authorization });

      expect(request.headers).to.not.have.property('authorization');
      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.user).to.be.eql(undefined);
      expect(authenticationResult.state).to.be.eql(undefined);
      expect(authenticationResult.error).to.be.eql(authenticationError);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('authenticates only via `authorization` header even if state is available.', async () => {
      const request = BasicCredentials.decorateRequest(requestFixture(), 'user', 'password');
      const user = { username: 'user' };
      const authorization = generateAuthorizationHeader('user1', 'password2');

      // GetUser will be called with request's `authorization` header.
      callWithRequest.withArgs(request, 'shield.authenticate').returns(Promise.resolve(user));

      const authenticationResult = await provider.authenticate(request, { authorization });

      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql(user);
      expect(authenticationResult.state).not.to.eql({ authorization: request.headers.authorization });
      sinon.assert.calledOnce(callWithRequest);
    });
  });

  describe('`deauthenticate` method', () => {
    let provider;
    beforeEach(() => {
      provider = new BasicAuthenticationProvider({
        client: { callWithRequest: sinon.stub() },
        basePath: '/base-path'
      });
    });

    it('always redirects to the login page.', async () => {
      const request = requestFixture();
      const deauthenticateResult = await provider.deauthenticate(request);
      expect(deauthenticateResult.redirected()).to.be(true);
      expect(deauthenticateResult.redirectURL).to.be('/base-path/login');
    });

    it('passes query string parameters to the login page.', async () => {
      const request = requestFixture({ search: '?next=%2Fapp%2Fml&msg=SESSION_EXPIRED' });
      const deauthenticateResult = await provider.deauthenticate(request);
      expect(deauthenticateResult.redirected()).to.be(true);
      expect(deauthenticateResult.redirectURL).to.be('/base-path/login?next=%2Fapp%2Fml&msg=SESSION_EXPIRED');
    });
  });

  describe('BasicCredentials', () => {
    it('`decorateRequest` fails if username or password is not provided.', () => {
      expect(() => BasicCredentials.decorateRequest()).to
        .throwError(/Request should be a valid object/);
      expect(() => BasicCredentials.decorateRequest({})).to
        .throwError(/Username should be a valid non-empty string/);
      expect(() => BasicCredentials.decorateRequest({}, '')).to
        .throwError(/Username should be a valid non-empty string/);
      expect(() => BasicCredentials.decorateRequest({}, '', '')).to
        .throwError(/Username should be a valid non-empty string/);
      expect(() => BasicCredentials.decorateRequest({}, 'username', '')).to
        .throwError(/Password should be a valid non-empty string/);
      expect(() => BasicCredentials.decorateRequest({}, '', 'password')).to
        .throwError(/Username should be a valid non-empty string/);
    });

    it('`decorateRequest` correctly sets authorization header.', () => {
      const oneRequest = requestFixture();
      const anotherRequest = requestFixture({ headers: { authorization: 'Basic ***' } });

      BasicCredentials.decorateRequest(oneRequest, 'one-user', 'one-password');
      BasicCredentials.decorateRequest(anotherRequest, 'another-user', 'another-password');

      expect(oneRequest.headers.authorization).to.be('Basic b25lLXVzZXI6b25lLXBhc3N3b3Jk');
      expect(anotherRequest.headers.authorization).to.be('Basic YW5vdGhlci11c2VyOmFub3RoZXItcGFzc3dvcmQ=');
    });
  });
});
