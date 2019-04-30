/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import Boom from 'boom';

import { serverFixture } from '../../__tests__/__fixtures__/server';
import { requestFixture } from '../../__tests__/__fixtures__/request';
import { Session } from '../session';
import { AuthScopeService } from '../../auth_scope_service';
import { LoginAttempt } from '../login_attempt';
import { initAuthenticator } from '../authenticator';
import * as ClientShield from '../../../../../../server/lib/get_client_shield';

describe('Authenticator', () => {
  const sandbox = sinon.createSandbox();

  let config;
  let server;
  let session;
  let cluster;
  beforeEach(() => {
    server = serverFixture();
    session = sinon.createStubInstance(Session);

    config = { get: sinon.stub() };

    // Cluster is returned by `getClient` function that is wrapped into `once` making cluster
    // a static singleton, so we should use sandbox to set/reset its behavior between tests.
    cluster = sinon.stub({ callWithRequest() {}, callWithInternalUser() {} });
    sandbox.stub(ClientShield, 'getClient').returns(cluster);

    server.config.returns(config);
    server.register.yields();

    sandbox.stub(Session, 'create').withArgs(server).returns(Promise.resolve(session));
    sandbox.stub(AuthScopeService.prototype, 'getForRequestAndUser')
      .returns(Promise.resolve([]));

    sandbox.useFakeTimers();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('initialization', () => {
    it('fails if authentication providers are not configured.', async () => {
      config.get.withArgs('xpack.security.authProviders').returns([]);

      try {
        await initAuthenticator(server);
        expect().fail('`initAuthenticator` should fail.');
      } catch(err) {
        expect(err).to.be.a(Error);
        expect(err.message).to.be(
          'No authentication provider is configured. Verify `xpack.security.authProviders` config value.'
        );
      }
    });

    it('fails if configured authentication provider is not known.', async () => {
      config.get.withArgs('xpack.security.authProviders').returns(['super-basic']);

      try {
        await initAuthenticator(server);
        expect().fail('`initAuthenticator` should fail.');
      } catch(err) {
        expect(err).to.be.a(Error);
        expect(err.message).to.be('Unsupported authentication provider name: super-basic.');
      }
    });
  });

  describe('`authenticate` method', () => {
    let authenticate;
    beforeEach(async () => {
      config.get.withArgs('xpack.security.authProviders').returns(['basic']);
      server.plugins.kibana.systemApi.isSystemApiRequest.returns(true);
      session.clear.throws(new Error('`Session.clear` is not supposed to be called!'));

      await initAuthenticator(server);

      // Second argument will be a method we'd like to test.
      authenticate = server.expose.withArgs('authenticate').firstCall.args[1];
    });

    it('fails if request is not provided.', async () => {
      try {
        await authenticate();
        expect().fail('`authenticate` should fail.');
      } catch(err) {
        expect(err).to.be.a(Error);
        expect(err.message).to.be('Request should be a valid object, was [undefined].');
      }
    });

    it('fails if any authentication providers fail.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      session.get.withArgs(request).returns(Promise.resolve(null));

      const failureReason = new Error('Not Authorized');
      cluster.callWithRequest.withArgs(request).returns(Promise.reject(failureReason));

      const authenticationResult = await authenticate(request);

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
    });

    it('returns user that authentication provider returns.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      const user = { username: 'user' };
      cluster.callWithRequest.withArgs(request).returns(Promise.resolve(user));

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql({
        ...user,
        scope: []
      });
    });

    it('creates session whenever authentication provider returns state for system API requests', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;
      loginAttempt.setCredentials('foo', 'bar');
      request.loginAttempt.returns(loginAttempt);

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(request).returns(true);

      cluster.callWithRequest
        .withArgs(request).returns(Promise.resolve(user));

      const systemAPIAuthenticationResult = await authenticate(request);
      expect(systemAPIAuthenticationResult.succeeded()).to.be(true);
      expect(systemAPIAuthenticationResult.user).to.be.eql({
        ...user,
        scope: []
      });
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, request, {
        state: { authorization },
        provider: 'basic'
      });
    });

    it('creates session whenever authentication provider returns state for non-system API requests', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;
      loginAttempt.setCredentials('foo', 'bar');
      request.loginAttempt.returns(loginAttempt);

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(request).returns(false);

      cluster.callWithRequest
        .withArgs(request).returns(Promise.resolve(user));

      const notSystemAPIAuthenticationResult = await authenticate(request);
      expect(notSystemAPIAuthenticationResult.succeeded()).to.be(true);
      expect(notSystemAPIAuthenticationResult.user).to.be.eql({
        ...user,
        scope: []
      });
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, request, {
        state: { authorization },
        provider: 'basic'
      });
    });

    it('extends session only for non-system API calls.', async () => {
      const user = { username: 'user' };
      const systemAPIRequest = requestFixture({ headers: { xCustomHeader: 'xxx' } });
      const notSystemAPIRequest = requestFixture({ headers: { xCustomHeader: 'yyy' } });

      session.get.withArgs(systemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Basic xxx' },
        provider: 'basic'
      }));

      session.get.withArgs(notSystemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Basic yyy' },
        provider: 'basic'
      }));

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest).returns(true)
        .withArgs(notSystemAPIRequest).returns(false);

      cluster.callWithRequest
        .withArgs(systemAPIRequest).returns(Promise.resolve(user))
        .withArgs(notSystemAPIRequest).returns(Promise.resolve(user));

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.succeeded()).to.be(true);
      expect(systemAPIAuthenticationResult.user).to.be.eql({
        ...user,
        scope: []
      });
      sinon.assert.notCalled(session.set);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.succeeded()).to.be(true);
      expect(notSystemAPIAuthenticationResult.user).to.be.eql({
        ...user,
        scope: []
      });
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, notSystemAPIRequest, {
        state: { authorization: 'Basic yyy' },
        provider: 'basic'
      });
    });

    it('does not extend session if authentication fails.', async () => {
      const systemAPIRequest = requestFixture({ headers: { xCustomHeader: 'xxx' } });
      const notSystemAPIRequest = requestFixture({ headers: { xCustomHeader: 'yyy' } });

      session.get.withArgs(systemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Basic xxx' },
        provider: 'basic'
      }));

      session.get.withArgs(notSystemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Basic yyy' },
        provider: 'basic'
      }));

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest).returns(true)
        .withArgs(notSystemAPIRequest).returns(false);

      cluster.callWithRequest
        .withArgs(systemAPIRequest).returns(Promise.reject(new Error('some error')))
        .withArgs(notSystemAPIRequest).returns(Promise.reject(new Error('some error')));

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.failed()).to.be(true);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.failed()).to.be(true);

      sinon.assert.notCalled(session.clear);
      sinon.assert.notCalled(session.set);
    });

    it('replaces existing session with the one returned by authentication provider for system API requests', async () => {
      const user = { username: 'user' };
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('foo', 'bar');
      request.loginAttempt.returns(loginAttempt);

      session.get.withArgs(request).returns(Promise.resolve({
        state: { authorization: 'Basic some-old-token' },
        provider: 'basic'
      }));

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(request).returns(true);

      cluster.callWithRequest
        .withArgs(request).returns(Promise.resolve(user));

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql({
        ...user,
        scope: []
      });
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, request, {
        state: { authorization },
        provider: 'basic'
      });
    });

    it('replaces existing session with the one returned by authentication provider for non-system API requests', async () => {
      const user = { username: 'user' };
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('foo', 'bar');
      request.loginAttempt.returns(loginAttempt);

      session.get.withArgs(request).returns(Promise.resolve({
        state: { authorization: 'Basic some-old-token' },
        provider: 'basic'
      }));

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(request).returns(false);

      cluster.callWithRequest
        .withArgs(request).returns(Promise.resolve(user));

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql({
        ...user,
        scope: []
      });
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, request, {
        state: { authorization },
        provider: 'basic'
      });
    });

    it('clears session if provider failed to authenticate request with 401 with active session.', async () => {
      const systemAPIRequest = requestFixture({ headers: { xCustomHeader: 'xxx' } });
      const notSystemAPIRequest = requestFixture({ headers: { xCustomHeader: 'yyy' } });

      session.get.withArgs(systemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Basic xxx' },
        provider: 'basic'
      }));

      session.get.withArgs(notSystemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Basic yyy' },
        provider: 'basic'
      }));

      session.clear.returns(Promise.resolve());

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest).returns(true)
        .withArgs(notSystemAPIRequest).returns(false);

      cluster.callWithRequest
        .withArgs(systemAPIRequest).returns(Promise.reject(Boom.unauthorized('token expired')))
        .withArgs(notSystemAPIRequest).returns(Promise.reject(Boom.unauthorized('invalid token')));

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.failed()).to.be(true);

      sinon.assert.calledOnce(session.clear);
      sinon.assert.calledWithExactly(session.clear, systemAPIRequest);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.failed()).to.be(true);

      sinon.assert.calledTwice(session.clear);
      sinon.assert.calledWithExactly(session.clear, notSystemAPIRequest);
    });

    it('clears session if provider requested it via setting state to `null`.', async () => {
      // Use `token` provider for this test as it's the only one that does what we want.
      config.get.withArgs('xpack.security.authProviders').returns(['token']);
      await initAuthenticator(server);
      authenticate = server.expose.withArgs('authenticate').lastCall.args[1];

      const request = requestFixture({ headers: { xCustomHeader: 'xxx' } });

      session.get.withArgs(request).resolves({
        state: { accessToken: 'access-xxx', refreshToken: 'refresh-xxx' },
        provider: 'token'
      });

      session.clear.resolves();

      cluster.callWithRequest
        .withArgs(request).rejects({ statusCode: 401 });

      cluster.callWithInternalUser.withArgs('shield.getAccessToken').rejects(
        Boom.badRequest('refresh token expired')
      );

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.redirected()).to.be(true);

      sinon.assert.calledOnce(session.clear);
      sinon.assert.calledWithExactly(session.clear, request);
    });

    it('does not clear session if provider failed to authenticate request with non-401 reason with active session.',
      async () => {
        const systemAPIRequest = requestFixture({ headers: { xCustomHeader: 'xxx' } });
        const notSystemAPIRequest = requestFixture({ headers: { xCustomHeader: 'yyy' } });

        session.get.withArgs(systemAPIRequest).returns(Promise.resolve({
          state: { authorization: 'Basic xxx' },
          provider: 'basic'
        }));

        session.get.withArgs(notSystemAPIRequest).returns(Promise.resolve({
          state: { authorization: 'Basic yyy' },
          provider: 'basic'
        }));

        session.clear.returns(Promise.resolve());

        server.plugins.kibana.systemApi.isSystemApiRequest
          .withArgs(systemAPIRequest).returns(true)
          .withArgs(notSystemAPIRequest).returns(false);

        cluster.callWithRequest
          .withArgs(systemAPIRequest).returns(Promise.reject(Boom.badRequest('something went wrong')))
          .withArgs(notSystemAPIRequest).returns(Promise.reject(new Error('Non boom error')));

        const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
        expect(systemAPIAuthenticationResult.failed()).to.be(true);

        const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
        expect(notSystemAPIAuthenticationResult.failed()).to.be(true);

        sinon.assert.notCalled(session.clear);
      });

    it('does not clear session if provider can not handle request authentication with active session.', async () => {
      // Add `kbn-xsrf` header to the raw part of the request to make `can_redirect_request`
      // think that it's AJAX request and redirect logic shouldn't be triggered.
      const systemAPIRequest = requestFixture({
        headers: { xCustomHeader: 'xxx', 'kbn-xsrf': 'xsrf' }
      });
      const notSystemAPIRequest = requestFixture({
        headers: { xCustomHeader: 'yyy', 'kbn-xsrf': 'xsrf' }
      });

      session.get.withArgs(systemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Some weird authentication schema...' },
        provider: 'basic'
      }));

      session.get.withArgs(notSystemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Some weird authentication schema...' },
        provider: 'basic'
      }));

      session.clear.returns(Promise.resolve());

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest).returns(true)
        .withArgs(notSystemAPIRequest).returns(false);

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.failed()).to.be(true);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.failed()).to.be(true);

      sinon.assert.notCalled(session.clear);
    });

    it('clears session if it belongs to not configured provider.', async () => {
      // Add `kbn-xsrf` header to the raw part of the request to make `can_redirect_request`
      // think that it's AJAX request and redirect logic shouldn't be triggered.
      const systemAPIRequest = requestFixture({
        headers: { xCustomHeader: 'xxx', 'kbn-xsrf': 'xsrf' }
      });
      const notSystemAPIRequest = requestFixture({
        headers: { xCustomHeader: 'yyy', 'kbn-xsrf': 'xsrf' }
      });

      session.get.withArgs(systemAPIRequest).resolves({
        state: { accessToken: 'some old token' },
        provider: 'token'
      });

      session.get.withArgs(notSystemAPIRequest).resolves({
        state: { accessToken: 'some old token' },
        provider: 'token'
      });

      session.clear.resolves();

      server.plugins.kibana.systemApi.isSystemApiRequest
        .withArgs(systemAPIRequest).returns(true)
        .withArgs(notSystemAPIRequest).returns(false);

      const systemAPIAuthenticationResult = await authenticate(systemAPIRequest);
      expect(systemAPIAuthenticationResult.notHandled()).to.be(true);
      sinon.assert.calledOnce(session.clear);

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.notHandled()).to.be(true);
      sinon.assert.calledTwice(session.clear);
    });

    it('complements user with `scope` property.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });

      cluster.callWithRequest.withArgs(request)
        .returns(Promise.resolve(user));
      AuthScopeService.prototype.getForRequestAndUser.withArgs(request, user)
        .returns(Promise.resolve(['foo', 'bar']));

      const authenticationResult = await authenticate(request);
      expect(authenticationResult.succeeded()).to.be(true);
      expect(authenticationResult.user).to.be.eql({
        ...user,
        scope: ['foo', 'bar']
      });
    });
  });

  describe('`deauthenticate` method', () => {
    let deauthenticate;
    beforeEach(async () => {
      config.get.withArgs('xpack.security.authProviders').returns(['basic']);
      config.get.withArgs('server.basePath').returns('/base-path');

      await initAuthenticator(server);

      // Second argument will be a method we'd like to test.
      deauthenticate = server.expose.withArgs('deauthenticate').firstCall.args[1];
    });

    it('fails if request is not provided.', async () => {
      try {
        await deauthenticate();
        expect().fail('`deauthenticate` should fail.');
      } catch(err) {
        expect(err).to.be.a(Error);
        expect(err.message).to.be('Request should be a valid object, was [undefined].');
      }
    });

    it('returns `notHandled` if session does not exist.', async () => {
      const request = requestFixture();
      session.get.withArgs(request).returns(null);

      const deauthenticationResult = await deauthenticate(request);

      expect(deauthenticationResult.notHandled()).to.be(true);
      sinon.assert.notCalled(session.clear);
    });

    it('clears session and returns whatever authentication provider returns.', async () => {
      const request = requestFixture({ search: '?next=%2Fapp%2Fml&msg=SESSION_EXPIRED' });
      session.get.withArgs(request).returns(Promise.resolve({
        state: {},
        provider: 'basic'
      }));

      const deauthenticationResult = await deauthenticate(request);

      sinon.assert.calledOnce(session.clear);
      sinon.assert.calledWithExactly(session.clear, request);
      expect(deauthenticationResult.redirected()).to.be(true);
      expect(deauthenticationResult.redirectURL).to.be('/base-path/login?next=%2Fapp%2Fml&msg=SESSION_EXPIRED');
    });

    it('only clears session if it belongs to not configured provider.', async () => {
      const request = requestFixture({ search: '?next=%2Fapp%2Fml&msg=SESSION_EXPIRED' });
      session.get.withArgs(request).resolves({
        state: {},
        provider: 'token'
      });

      const deauthenticationResult = await deauthenticate(request);

      sinon.assert.calledOnce(session.clear);
      sinon.assert.calledWithExactly(session.clear, request);
      expect(deauthenticationResult.notHandled()).to.be(true);
    });
  });

  describe('`isAuthenticated` method', () => {
    let isAuthenticated;
    beforeEach(async () => {
      config.get.withArgs('xpack.security.authProviders').returns(['basic']);

      await initAuthenticator(server);

      // Second argument will be a method we'd like to test.
      isAuthenticated = server.expose.withArgs('isAuthenticated').firstCall.args[1];
    });

    it('returns `true` if `getUser` succeeds.', async () => {
      const request = requestFixture();
      server.plugins.security.getUser
        .withArgs(request)
        .returns(Promise.resolve({}));

      expect(await isAuthenticated(request)).to.be(true);
    });

    it('returns `false` when `getUser` throws a 401 boom error.', async () => {
      const request = requestFixture();
      server.plugins.security.getUser
        .withArgs(request)
        .returns(Promise.reject(Boom.unauthorized()));

      expect(await isAuthenticated(request)).to.be(false);
    });

    it('throw non-boom errors.', async () => {
      const request = requestFixture();
      const nonBoomError = new TypeError();
      server.plugins.security.getUser
        .withArgs(request)
        .returns(Promise.reject(nonBoomError));

      try {
        await isAuthenticated(request);
        throw new Error('`isAuthenticated` should throw.');
      } catch (err) {
        expect(err).to.be(nonBoomError);
      }
    });

    it('throw non-401 boom errors.', async () => {
      const request = requestFixture();
      const non401Error = Boom.boomify(new TypeError());
      server.plugins.security.getUser
        .withArgs(request)
        .returns(Promise.reject(non401Error));

      try {
        await isAuthenticated(request);
        throw new Error('`isAuthenticated` should throw.');
      } catch (err) {
        expect(err).to.be(non401Error);
      }
    });
  });
});
