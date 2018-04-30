/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import Boom from 'boom';
import Joi from 'joi';
import sinon from 'sinon';

import { serverFixture } from '../../../../lib/__tests__/__fixtures__/server';
import { requestFixture } from '../../../../lib/__tests__/__fixtures__/request';
import { AuthenticationResult } from '../../../../../server/lib/authentication/authentication_result';
import { BasicCredentials } from '../../../../../server/lib/authentication/providers/basic';
import { initAuthenticateApi } from '../authenticate';
import { DeauthenticationResult } from '../../../../lib/authentication/deauthentication_result';

describe('Authentication routes', () => {
  let serverStub;
  let replyStub;

  beforeEach(() => {
    serverStub = serverFixture();
    replyStub = sinon.stub();
    replyStub.continue = sinon.stub();
    replyStub.redirect = sinon.stub();

    initAuthenticateApi(serverStub);
  });

  describe('login', () => {
    let loginRoute;
    let request;
    let authenticateStub;

    beforeEach(() => {
      loginRoute = serverStub.route
        .withArgs(sinon.match({ path: '/api/security/v1/login' }))
        .firstCall
        .args[0];

      request = {
        headers: {},
        payload: { username: 'user', password: 'password' }
      };

      authenticateStub = serverStub.plugins.security.authenticate.withArgs(
        sinon.match(BasicCredentials.decorateRequest({ headers: {} }, 'user', 'password'))
      );
    });

    it('correctly defines route.', async () => {
      expect(loginRoute.method).to.be('POST');
      expect(loginRoute.path).to.be('/api/security/v1/login');
      expect(loginRoute.handler).to.be.a(Function);
      expect(loginRoute.config).to.eql({
        auth: false,
        validate: {
          payload: {
            username: Joi.string().required(),
            password: Joi.string().required()
          }
        }
      });
    });

    it('returns 500 if authentication throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      authenticateStub.throws(unhandledException);

      await loginRoute.handler(request, replyStub);

      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(replyStub, sinon.match({
        isBoom: true,
        output: {
          payload: {
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An internal server error occurred'
          }
        }
      }));
    });

    it('returns 401 if authentication fails.', async () => {
      const failureReason = new Error('Something went wrong.');
      authenticateStub.returns(Promise.resolve(AuthenticationResult.failed(failureReason)));

      await loginRoute.handler(request, replyStub);

      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(replyStub, Boom.unauthorized(failureReason));
    });

    it('returns 401 if authentication is not handled.', async () => {
      authenticateStub.returns(
        Promise.resolve(AuthenticationResult.notHandled())
      );

      await loginRoute.handler(request, replyStub);

      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(replyStub, Boom.unauthorized());
    });

    it('returns user data if authentication succeed.', async () => {
      const user = { username: 'user' };
      authenticateStub.returns(
        Promise.resolve(AuthenticationResult.succeeded(user))
      );

      await loginRoute.handler(request, replyStub);

      sinon.assert.notCalled(replyStub);
      sinon.assert.calledOnce(replyStub.continue);
      sinon.assert.calledWithExactly(replyStub.continue, { credentials: user });
    });
  });

  describe('logout', () => {
    let logoutRoute;

    beforeEach(() => {
      serverStub.config.returns({
        get: sinon.stub().withArgs('server.basePath').returns('/test-base-path')
      });

      logoutRoute = serverStub.route
        .withArgs(sinon.match({ path: '/api/security/v1/logout' }))
        .firstCall
        .args[0];
    });

    it('correctly defines route.', async () => {
      expect(logoutRoute.method).to.be('GET');
      expect(logoutRoute.path).to.be('/api/security/v1/logout');
      expect(logoutRoute.handler).to.be.a(Function);
      expect(logoutRoute.config).to.eql({ auth: false });
    });

    it('returns 500 if deauthentication throws unhandled exception.', async () => {
      const request = requestFixture();

      const unhandledException = new Error('Something went wrong.');
      serverStub.plugins.security.deauthenticate
        .withArgs(request)
        .returns(Promise.reject(unhandledException));

      await logoutRoute.handler(request, replyStub);

      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(replyStub, Boom.wrap(unhandledException));
      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.notCalled(replyStub.redirect);
    });

    it('returns 500 if authenticator fails to deauthenticate.', async () => {
      const request = requestFixture();

      const failureReason = Boom.forbidden();
      serverStub.plugins.security.deauthenticate
        .withArgs(request)
        .returns(Promise.resolve(DeauthenticationResult.failed(failureReason)));

      await logoutRoute.handler(request, replyStub);

      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(replyStub, Boom.wrap(failureReason));
      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.notCalled(replyStub.redirect);
    });

    it('returns 400 for AJAX requests that can not handle redirect.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      await logoutRoute.handler(request, replyStub);

      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(
        replyStub,
        Boom.badRequest('Client should be able to process redirect response.')
      );
      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.notCalled(replyStub.redirect);
    });

    it('redirects user to the URL returned by authenticator.', async () => {
      const request = requestFixture();

      serverStub.plugins.security.deauthenticate
        .withArgs(request)
        .returns(
          Promise.resolve(DeauthenticationResult.redirectTo('https://custom.logout'))
        );

      await logoutRoute.handler(request, replyStub);

      sinon.assert.calledOnce(replyStub.redirect);
      sinon.assert.calledWithExactly(replyStub.redirect, 'https://custom.logout');
      sinon.assert.notCalled(replyStub);
      sinon.assert.notCalled(replyStub.continue);
    });

    it('redirects user to the base path if deauthentication succeeds.', async () => {
      const request = requestFixture();

      serverStub.plugins.security.deauthenticate
        .withArgs(request)
        .returns(Promise.resolve(DeauthenticationResult.succeeded()));

      await logoutRoute.handler(request, replyStub);

      sinon.assert.calledOnce(replyStub.redirect);
      sinon.assert.calledWithExactly(replyStub.redirect, '/test-base-path/');
      sinon.assert.notCalled(replyStub);
      sinon.assert.notCalled(replyStub.continue);
    });

    it('redirects user to the base path if deauthentication is not handled.', async () => {
      const request = requestFixture();

      serverStub.plugins.security.deauthenticate
        .withArgs(request)
        .returns(Promise.resolve(DeauthenticationResult.notHandled()));

      await logoutRoute.handler(request, replyStub);

      sinon.assert.calledOnce(replyStub.redirect);
      sinon.assert.calledWithExactly(replyStub.redirect, '/test-base-path/');
      sinon.assert.notCalled(replyStub);
      sinon.assert.notCalled(replyStub.continue);
    });
  });

  describe('me', () => {
    let meRoute;

    beforeEach(() => {
      meRoute = serverStub.route
        .withArgs(sinon.match({ path: '/api/security/v1/me' }))
        .firstCall
        .args[0];
    });

    it('correctly defines route.', async () => {
      expect(meRoute.method).to.be('GET');
      expect(meRoute.path).to.be('/api/security/v1/me');
      expect(meRoute.handler).to.be.a(Function);
      expect(meRoute.config).to.be(undefined);
    });

    it('returns user from the authenticated request property.', async () => {
      const request = { auth: { credentials: { username: 'user' } } };
      await meRoute.handler(request, replyStub);

      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(replyStub, { username: 'user' });
    });
  });

  describe('SAML assertion consumer service endpoint', () => {
    let samlAcsRoute;
    let request;

    beforeEach(() => {
      samlAcsRoute = serverStub.route
        .withArgs(sinon.match({ path: '/api/security/v1/saml' }))
        .firstCall
        .args[0];

      request = requestFixture({ payload: { SAMLResponse: 'saml-response-xml' } });
    });

    it('correctly defines route.', async () => {
      expect(samlAcsRoute.method).to.be('POST');
      expect(samlAcsRoute.path).to.be('/api/security/v1/saml');
      expect(samlAcsRoute.handler).to.be.a(Function);
      expect(samlAcsRoute.config).to.eql({
        auth: false,
        validate: {
          payload: {
            SAMLResponse: Joi.string().required(),
            RelayState: Joi.string().allow('')
          }
        }
      });
    });

    it('returns 500 if authentication throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      serverStub.plugins.security.authenticate.throws(unhandledException);

      await samlAcsRoute.handler(request, replyStub);

      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.notCalled(replyStub.redirect);
      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(replyStub, sinon.match({
        isBoom: true,
        output: {
          payload: {
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An internal server error occurred'
          }
        }
      }));
    });

    it('returns 401 if authentication fails.', async () => {
      const failureReason = new Error('Something went wrong.');
      serverStub.plugins.security.authenticate.returns(
        Promise.resolve(AuthenticationResult.failed(failureReason))
      );

      await samlAcsRoute.handler(request, replyStub);

      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.notCalled(replyStub.redirect);
      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(replyStub, Boom.unauthorized(failureReason));
    });

    it('returns 401 if authentication is not handled.', async () => {
      serverStub.plugins.security.authenticate.returns(
        Promise.resolve(AuthenticationResult.notHandled())
      );

      await samlAcsRoute.handler(request, replyStub);

      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.notCalled(replyStub.redirect);
      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(replyStub, Boom.unauthorized());
    });

    it('returns 403 if there an active session exists.', async () => {
      serverStub.plugins.security.authenticate.returns(
        Promise.resolve(AuthenticationResult.succeeded({}))
      );

      await samlAcsRoute.handler(request, replyStub);

      sinon.assert.notCalled(replyStub.continue);
      sinon.assert.notCalled(replyStub.redirect);
      sinon.assert.calledOnce(replyStub);
      sinon.assert.calledWithExactly(
        replyStub,
        Boom.forbidden(
          'Sorry, you already have an active Kibana session. ' +
          'If you want to start a new one, please logout from the existing session first.'
        )
      );
    });

    it('redirects if required by the authentication process.', async () => {
      serverStub.plugins.security.authenticate.returns(
        Promise.resolve(AuthenticationResult.redirectTo('http://redirect-to/path'))
      );

      await samlAcsRoute.handler(request, replyStub);

      sinon.assert.calledWithExactly(replyStub.redirect, 'http://redirect-to/path');
      sinon.assert.notCalled(replyStub);
      sinon.assert.notCalled(replyStub.continue);
    });
  });
});
