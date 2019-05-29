/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import Boom from 'boom';
import { Legacy } from 'kibana';

import { serverFixture } from '../__tests__/__fixtures__/server';
import { requestFixture } from '../__tests__/__fixtures__/request';
import { AuthenticationResult } from './authentication_result';
import { DeauthenticationResult } from './deauthentication_result';
import { Session } from './session';
import { LoginAttempt } from './login_attempt';
import { initAuthenticator } from './authenticator';
import * as ClientShield from '../../../../../server/lib/get_client_shield';

describe('Authenticator', () => {
  const sandbox = sinon.createSandbox();

  let config: sinon.SinonStubbedInstance<Legacy.KibanaConfig>;
  let server: ReturnType<typeof serverFixture>;
  let session: sinon.SinonStubbedInstance<Session>;
  let cluster: sinon.SinonStubbedInstance<{
    callWithRequest: (request: ReturnType<typeof requestFixture>, ...args: any[]) => any;
    callWithInternalUser: (...args: any[]) => any;
  }>;
  beforeEach(() => {
    server = serverFixture();
    session = sinon.createStubInstance(Session);

    config = { get: sinon.stub(), has: sinon.stub() };

    // Cluster is returned by `getClient` function that is wrapped into `once` making cluster
    // a static singleton, so we should use sandbox to set/reset its behavior between tests.
    cluster = sinon.stub({ callWithRequest() {}, callWithInternalUser() {} });
    sandbox.stub(ClientShield, 'getClient').returns(cluster);

    server.config.returns(config);
    server.register.yields();

    sandbox
      .stub(Session, 'create')
      .withArgs(server as any)
      .resolves(session as any);

    sandbox.useFakeTimers();
  });

  afterEach(() => sandbox.restore());

  describe('initialization', () => {
    it('fails if authentication providers are not configured.', async () => {
      config.get.withArgs('xpack.security.authc.providers').returns([]);

      await expect(initAuthenticator(server as any)).rejects.toThrowError(
        'No authentication provider is configured. Verify `xpack.security.authc.providers` config value.'
      );
    });

    it('fails if configured authentication provider is not known.', async () => {
      config.get.withArgs('xpack.security.authc.providers').returns(['super-basic']);

      await expect(initAuthenticator(server as any)).rejects.toThrowError(
        'Unsupported authentication provider name: super-basic.'
      );
    });
  });

  describe('`authenticate` method', () => {
    let authenticate: (request: ReturnType<typeof requestFixture>) => Promise<AuthenticationResult>;
    beforeEach(async () => {
      config.get.withArgs('xpack.security.authc.providers').returns(['basic']);
      server.plugins.kibana.systemApi.isSystemApiRequest.returns(true);
      session.clear.throws(new Error('`Session.clear` is not supposed to be called!'));

      await initAuthenticator(server as any);

      // Second argument will be a method we'd like to test.
      authenticate = server.expose.withArgs('authenticate').firstCall.args[1];
    });

    it('fails if request is not provided.', async () => {
      await expect(authenticate(undefined as any)).rejects.toThrowError(
        'Request should be a valid object, was [undefined].'
      );
    });

    it('fails if any authentication providers fail.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      session.get.withArgs(request).resolves(null);

      const failureReason = new Error('Not Authorized');
      cluster.callWithRequest.withArgs(request).rejects(failureReason);

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('returns user that authentication provider returns.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      const user = { username: 'user' };
      cluster.callWithRequest.withArgs(request).resolves(user);

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
    });

    it('creates session whenever authentication provider returns state for system API requests', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;
      loginAttempt.setCredentials('foo', 'bar');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      server.plugins.kibana.systemApi.isSystemApiRequest.withArgs(request).returns(true);

      cluster.callWithRequest.withArgs(request).resolves(user);

      const systemAPIAuthenticationResult = await authenticate(request);
      expect(systemAPIAuthenticationResult.succeeded()).toBe(true);
      expect(systemAPIAuthenticationResult.user).toEqual(user);
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, request, {
        state: { authorization },
        provider: 'basic',
      });
    });

    it('creates session whenever authentication provider returns state for non-system API requests', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;
      loginAttempt.setCredentials('foo', 'bar');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      server.plugins.kibana.systemApi.isSystemApiRequest.withArgs(request).returns(false);

      cluster.callWithRequest.withArgs(request).resolves(user);

      const notSystemAPIAuthenticationResult = await authenticate(request);
      expect(notSystemAPIAuthenticationResult.succeeded()).toBe(true);
      expect(notSystemAPIAuthenticationResult.user).toEqual(user);
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, request, {
        state: { authorization },
        provider: 'basic',
      });
    });

    it('extends session only for non-system API calls.', async () => {
      const user = { username: 'user' };
      const systemAPIRequest = requestFixture({ headers: { xCustomHeader: 'xxx' } });
      const notSystemAPIRequest = requestFixture({ headers: { xCustomHeader: 'yyy' } });

      session.get.withArgs(systemAPIRequest).resolves({
        state: { authorization: 'Basic xxx' },
        provider: 'basic',
      });

      session.get.withArgs(notSystemAPIRequest).resolves({
        state: { authorization: 'Basic yyy' },
        provider: 'basic',
      });

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest)
        .returns(true)
        .withArgs(notSystemAPIRequest)
        .returns(false);

      cluster.callWithRequest
        .withArgs(systemAPIRequest)
        .resolves(user)
        .withArgs(notSystemAPIRequest)
        .resolves(user);

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.succeeded()).toBe(true);
      expect(systemAPIAuthenticationResult.user).toEqual(user);
      sinon.assert.notCalled(session.set);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.succeeded()).toBe(true);
      expect(notSystemAPIAuthenticationResult.user).toEqual(user);
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, notSystemAPIRequest, {
        state: { authorization: 'Basic yyy' },
        provider: 'basic',
      });
    });

    it('does not extend session if authentication fails.', async () => {
      const systemAPIRequest = requestFixture({ headers: { xCustomHeader: 'xxx' } });
      const notSystemAPIRequest = requestFixture({ headers: { xCustomHeader: 'yyy' } });

      session.get.withArgs(systemAPIRequest).resolves({
        state: { authorization: 'Basic xxx' },
        provider: 'basic',
      });

      session.get.withArgs(notSystemAPIRequest).resolves({
        state: { authorization: 'Basic yyy' },
        provider: 'basic',
      });

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest)
        .returns(true)
        .withArgs(notSystemAPIRequest)
        .returns(false);

      cluster.callWithRequest
        .withArgs(systemAPIRequest)
        .rejects(new Error('some error'))
        .withArgs(notSystemAPIRequest)
        .rejects(new Error('some error'));

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.failed()).toBe(true);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.failed()).toBe(true);

      sinon.assert.notCalled(session.clear);
      sinon.assert.notCalled(session.set);
    });

    it('replaces existing session with the one returned by authentication provider for system API requests', async () => {
      const user = { username: 'user' };
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('foo', 'bar');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      session.get.withArgs(request).resolves({
        state: { authorization: 'Basic some-old-token' },
        provider: 'basic',
      });

      server.plugins.kibana.systemApi.isSystemApiRequest.withArgs(request).returns(true);

      cluster.callWithRequest.withArgs(request).resolves(user);

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, request, {
        state: { authorization },
        provider: 'basic',
      });
    });

    it('replaces existing session with the one returned by authentication provider for non-system API requests', async () => {
      const user = { username: 'user' };
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('foo', 'bar');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      session.get.withArgs(request).resolves({
        state: { authorization: 'Basic some-old-token' },
        provider: 'basic',
      });

      server.plugins.kibana.systemApi.isSystemApiRequest.withArgs(request).returns(false);

      cluster.callWithRequest.withArgs(request).resolves(user);

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, request, {
        state: { authorization },
        provider: 'basic',
      });
    });

    it('clears session if provider failed to authenticate request with 401 with active session.', async () => {
      const systemAPIRequest = requestFixture({ headers: { xCustomHeader: 'xxx' } });
      const notSystemAPIRequest = requestFixture({ headers: { xCustomHeader: 'yyy' } });

      session.get.withArgs(systemAPIRequest).resolves({
        state: { authorization: 'Basic xxx' },
        provider: 'basic',
      });

      session.get.withArgs(notSystemAPIRequest).resolves({
        state: { authorization: 'Basic yyy' },
        provider: 'basic',
      });

      session.clear.resolves();

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest)
        .returns(true)
        .withArgs(notSystemAPIRequest)
        .returns(false);

      cluster.callWithRequest
        .withArgs(systemAPIRequest)
        .rejects(Boom.unauthorized('token expired'))
        .withArgs(notSystemAPIRequest)
        .rejects(Boom.unauthorized('invalid token'));

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.failed()).toBe(true);

      sinon.assert.calledOnce(session.clear);
      sinon.assert.calledWithExactly(session.clear, systemAPIRequest);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.failed()).toBe(true);

      sinon.assert.calledTwice(session.clear);
      sinon.assert.calledWithExactly(session.clear, notSystemAPIRequest);
    });

    it('clears session if provider requested it via setting state to `null`.', async () => {
      // Use `token` provider for this test as it's the only one that does what we want.
      config.get.withArgs('xpack.security.authc.providers').returns(['token']);
      await initAuthenticator(server as any);
      authenticate = server.expose.withArgs('authenticate').lastCall.args[1];

      const request = requestFixture({ headers: { xCustomHeader: 'xxx' } });

      session.get.withArgs(request).resolves({
        state: { accessToken: 'access-xxx', refreshToken: 'refresh-xxx' },
        provider: 'token',
      });

      session.clear.resolves();

      cluster.callWithRequest.withArgs(request).rejects({ statusCode: 401 });

      cluster.callWithInternalUser
        .withArgs('shield.getAccessToken')
        .rejects(Boom.badRequest('refresh token expired'));

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.redirected()).toBe(true);

      sinon.assert.calledOnce(session.clear);
      sinon.assert.calledWithExactly(session.clear, request);
    });

    it('does not clear session if provider failed to authenticate request with non-401 reason with active session.', async () => {
      const systemAPIRequest = requestFixture({ headers: { xCustomHeader: 'xxx' } });
      const notSystemAPIRequest = requestFixture({ headers: { xCustomHeader: 'yyy' } });

      session.get.withArgs(systemAPIRequest).resolves({
        state: { authorization: 'Basic xxx' },
        provider: 'basic',
      });

      session.get.withArgs(notSystemAPIRequest).resolves({
        state: { authorization: 'Basic yyy' },
        provider: 'basic',
      });

      session.clear.resolves();

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest)
        .returns(true)
        .withArgs(notSystemAPIRequest)
        .returns(false);

      cluster.callWithRequest
        .withArgs(systemAPIRequest)
        .rejects(Boom.badRequest('something went wrong'))
        .withArgs(notSystemAPIRequest)
        .rejects(new Error('Non boom error'));

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.failed()).toBe(true);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.failed()).toBe(true);

      sinon.assert.notCalled(session.clear);
    });

    it('does not clear session if provider can not handle request authentication with active session.', async () => {
      // Add `kbn-xsrf` header to the raw part of the request to make `can_redirect_request`
      // think that it's AJAX request and redirect logic shouldn't be triggered.
      const systemAPIRequest = requestFixture({
        headers: { xCustomHeader: 'xxx', 'kbn-xsrf': 'xsrf' },
      });
      const notSystemAPIRequest = requestFixture({
        headers: { xCustomHeader: 'yyy', 'kbn-xsrf': 'xsrf' },
      });

      session.get.withArgs(systemAPIRequest).resolves({
        state: { authorization: 'Some weird authentication schema...' },
        provider: 'basic',
      });

      session.get.withArgs(notSystemAPIRequest).resolves({
        state: { authorization: 'Some weird authentication schema...' },
        provider: 'basic',
      });

      session.clear.resolves();

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest)
        .returns(true)
        .withArgs(notSystemAPIRequest)
        .returns(false);

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.failed()).toBe(true);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.failed()).toBe(true);

      sinon.assert.notCalled(session.clear);
    });

    it('clears session if it belongs to not configured provider.', async () => {
      // Add `kbn-xsrf` header to the raw part of the request to make `can_redirect_request`
      // think that it's AJAX request and redirect logic shouldn't be triggered.
      const systemAPIRequest = requestFixture({
        headers: { xCustomHeader: 'xxx', 'kbn-xsrf': 'xsrf' },
      });
      const notSystemAPIRequest = requestFixture({
        headers: { xCustomHeader: 'yyy', 'kbn-xsrf': 'xsrf' },
      });

      session.get.withArgs(systemAPIRequest).resolves({
        state: { accessToken: 'some old token' },
        provider: 'token',
      });

      session.get.withArgs(notSystemAPIRequest).resolves({
        state: { accessToken: 'some old token' },
        provider: 'token',
      });

      session.clear.resolves();

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest)
        .returns(true)
        .withArgs(notSystemAPIRequest)
        .returns(false);

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.notHandled()).toBe(true);
      sinon.assert.calledOnce(session.clear);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.notHandled()).toBe(true);
      sinon.assert.calledTwice(session.clear);
    });
  });

  describe('`deauthenticate` method', () => {
    let deauthenticate: (
      request: ReturnType<typeof requestFixture>
    ) => Promise<DeauthenticationResult>;
    beforeEach(async () => {
      config.get.withArgs('xpack.security.authc.providers').returns(['basic']);
      config.get.withArgs('server.basePath').returns('/base-path');

      await initAuthenticator(server as any);

      // Second argument will be a method we'd like to test.
      deauthenticate = server.expose.withArgs('deauthenticate').firstCall.args[1];
    });

    it('fails if request is not provided.', async () => {
      await expect(deauthenticate(undefined as any)).rejects.toThrowError(
        'Request should be a valid object, was [undefined].'
      );
    });

    it('returns `notHandled` if session does not exist.', async () => {
      const request = requestFixture();
      session.get.withArgs(request).resolves(null);

      const deauthenticationResult = await deauthenticate(request);

      expect(deauthenticationResult.notHandled()).toBe(true);
      sinon.assert.notCalled(session.clear);
    });

    it('clears session and returns whatever authentication provider returns.', async () => {
      const request = requestFixture({ search: '?next=%2Fapp%2Fml&msg=SESSION_EXPIRED' });
      session.get.withArgs(request).resolves({
        state: {},
        provider: 'basic',
      });

      const deauthenticationResult = await deauthenticate(request);

      sinon.assert.calledOnce(session.clear);
      sinon.assert.calledWithExactly(session.clear, request);
      expect(deauthenticationResult.redirected()).toBe(true);
      expect(deauthenticationResult.redirectURL).toBe(
        '/base-path/login?next=%2Fapp%2Fml&msg=SESSION_EXPIRED'
      );
    });

    it('only clears session if it belongs to not configured provider.', async () => {
      const request = requestFixture({ search: '?next=%2Fapp%2Fml&msg=SESSION_EXPIRED' });
      session.get.withArgs(request).resolves({
        state: {},
        provider: 'token',
      });

      const deauthenticationResult = await deauthenticate(request);

      sinon.assert.calledOnce(session.clear);
      sinon.assert.calledWithExactly(session.clear, request);
      expect(deauthenticationResult.notHandled()).toBe(true);
    });
  });

  describe('`isAuthenticated` method', () => {
    let isAuthenticated: (request: ReturnType<typeof requestFixture>) => Promise<boolean>;
    beforeEach(async () => {
      config.get.withArgs('xpack.security.authc.providers').returns(['basic']);

      await initAuthenticator(server as any);

      // Second argument will be a method we'd like to test.
      isAuthenticated = server.expose.withArgs('isAuthenticated').firstCall.args[1];
    });

    it('returns `true` if `getUser` succeeds.', async () => {
      const request = requestFixture();
      server.plugins.security.getUser.withArgs(request).resolves({});

      await expect(isAuthenticated(request)).resolves.toBe(true);
    });

    it('returns `false` when `getUser` throws a 401 boom error.', async () => {
      const request = requestFixture();
      server.plugins.security.getUser.withArgs(request).rejects(Boom.unauthorized());

      await expect(isAuthenticated(request)).resolves.toBe(false);
    });

    it('throw non-boom errors.', async () => {
      const request = requestFixture();
      const nonBoomError = new TypeError();
      server.plugins.security.getUser.withArgs(request).rejects(nonBoomError);

      await expect(isAuthenticated(request)).rejects.toThrowError(nonBoomError);
    });

    it('throw non-401 boom errors.', async () => {
      const request = requestFixture();
      const non401Error = Boom.boomify(new TypeError());
      server.plugins.security.getUser.withArgs(request).rejects(non401Error);

      await expect(isAuthenticated(request)).rejects.toThrowError(non401Error);
    });
  });
});
