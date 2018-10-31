/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import Boom from 'boom';

import { serverFixture } from '../../__tests__/__fixtures__/server';
import { requestFixture } from '../../__tests__/__fixtures__/request';
import { Session } from '../session';
import { AuthScopeService } from '../../auth_scope_service';
import { initAuthenticator } from '../authenticator';
import * as ClientShield from '../../../../../../server/lib/get_client_shield';

describe('Authenticator', () => {
  const sandbox = sinon.createSandbox();

  let config;
  let server;
  let session;
  let cluster;
  let authorizationMode;
  beforeEach(() => {
    server = serverFixture();
    session = sinon.createStubInstance(Session);

    config = { get: sinon.stub() };
    cluster = { callWithRequest: sinon.stub() };

    // Cluster is returned by `getClient` function that is wrapped into `once` making cluster
    // a static singleton, so we should use sandbox to set/reset its behavior between tests.
    cluster = sinon.stub({ callWithRequest() {} });
    sandbox.stub(ClientShield, 'getClient').returns(cluster);

    authorizationMode = { initialize: sinon.stub() };

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

      await initAuthenticator(server, authorizationMode);

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

    it('fails if all authentication providers fail.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      session.get.withArgs(request).returns(Promise.resolve(null));

      const failureReason = new Error('Not Authorized');
      cluster.callWithRequest.withArgs(request).returns(Promise.reject(failureReason));

      const authenticationResult = await authenticate(request);

      expect(authenticationResult.failed()).to.be(true);
      expect(authenticationResult.error).to.be(failureReason);
    });

    it(`doesn't initialize authorizationMode when authentication fails.`, async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      session.get.withArgs(request).returns(Promise.resolve(null));

      const failureReason = new Error('Not Authorized');
      cluster.callWithRequest.withArgs(request).returns(Promise.reject(failureReason));

      await authenticate(request);

      sinon.assert.notCalled(authorizationMode.initialize);
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

    it('initiliazes authorizationMode when authentication succeeds.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      const user = { username: 'user' };
      cluster.callWithRequest.withArgs(request).returns(Promise.resolve(user));

      await authenticate(request);
      sinon.assert.calledWith(authorizationMode.initialize, request);
    });

    it('creates session whenever authentication provider returns state to store.', async () => {
      const user = { username: 'user' };
      const systemAPIRequest = requestFixture({ headers: { authorization: 'Basic xxx' } });
      const notSystemAPIRequest = requestFixture({ headers: { authorization: 'Basic yyy' } });

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
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, systemAPIRequest, {
        state: { authorization: systemAPIRequest.headers.authorization },
        provider: 'basic'
      });

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.succeeded()).to.be(true);
      expect(notSystemAPIAuthenticationResult.user).to.be.eql({
        ...user,
        scope: []
      });
      sinon.assert.calledTwice(session.set);
      sinon.assert.calledWithExactly(session.set, notSystemAPIRequest, {
        state: { authorization: notSystemAPIRequest.headers.authorization },
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

    it('replaces existing session with the one returned by authentication provider.', async () => {
      const user = { username: 'user' };
      const systemAPIRequest = requestFixture({ headers: { authorization: 'Basic xxx-new' } });
      const notSystemAPIRequest = requestFixture({ headers: { authorization: 'Basic yyy-new' } });

      session.get.withArgs(systemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Basic xxx-old' },
        provider: 'basic'
      }));

      session.get.withArgs(notSystemAPIRequest).returns(Promise.resolve({
        state: { authorization: 'Basic yyy-old' },
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
      sinon.assert.calledOnce(session.set);
      sinon.assert.calledWithExactly(session.set, systemAPIRequest, {
        state: { authorization: 'Basic xxx-new' },
        provider: 'basic'
      });

      const notSystemAPIAuthenticationResult = await authenticate(notSystemAPIRequest);
      expect(notSystemAPIAuthenticationResult.succeeded()).to.be(true);
      expect(notSystemAPIAuthenticationResult.user).to.be.eql({
        ...user,
        scope: []
      });
      sinon.assert.calledTwice(session.set);
      sinon.assert.calledWithExactly(session.set, notSystemAPIRequest, {
        state: { authorization: 'Basic yyy-new' },
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
