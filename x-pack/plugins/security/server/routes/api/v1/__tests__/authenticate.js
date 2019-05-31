/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
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
  let hStub;

  beforeEach(() => {
    serverStub = serverFixture();
    hStub = {
      authenticated: sinon.stub(),
      continue: 'blah',
      redirect: sinon.stub(),
      response: sinon.stub()
    };

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

      request = requestFixture({
        headers: {},
        payload: { username: 'user', password: 'password' }
      });

      authenticateStub = serverStub.plugins.security.authenticate.withArgs(
        sinon.match(BasicCredentials.decorateRequest(request, 'user', 'password'))
      );
    });

    it('correctly defines route.', async () => {
      expect(loginRoute.method).to.be('POST');
      expect(loginRoute.path).to.be('/api/security/v1/login');
      expect(loginRoute.handler).to.be.a(Function);
      expect(loginRoute.config).to.eql({
        auth: false,
        validate: {
          payload: Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required()
          })
        },
        response: {
          emptyStatusCode: 204,
        }
      });
    });

    it('returns 500 if authentication throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      authenticateStub.throws(unhandledException);

      return loginRoute
        .handler(request, hStub)
        .catch((response) => {
          expect(response.isBoom).to.be(true);
          expect(response.output.payload).to.eql({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An internal server error occurred'
          });
        });
    });

    it('returns 401 if authentication fails.', async () => {
      const failureReason = new Error('Something went wrong.');
      authenticateStub.returns(Promise.resolve(AuthenticationResult.failed(failureReason)));

      return loginRoute
        .handler(request, hStub)
        .catch((response) => {
          expect(response.isBoom).to.be(true);
          expect(response.message).to.be(failureReason.message);
          expect(response.output.statusCode).to.be(401);
        });
    });

    it('returns 401 if authentication is not handled.', async () => {
      authenticateStub.returns(
        Promise.resolve(AuthenticationResult.notHandled())
      );

      return loginRoute
        .handler(request, hStub)
        .catch((response) => {
          expect(response.isBoom).to.be(true);
          expect(response.message).to.be('Unauthorized');
          expect(response.output.statusCode).to.be(401);
        });
    });

    describe('authentication succeeds', () => {

      it(`returns user data`, async () => {
        const user = { username: 'user' };
        authenticateStub.returns(
          Promise.resolve(AuthenticationResult.succeeded(user))
        );

        await loginRoute.handler(request, hStub);

        sinon.assert.calledOnce(hStub.response);
      });
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

      return logoutRoute
        .handler(request, hStub)
        .catch((response) => {
          expect(response).to.be(Boom.boomify(unhandledException));
          sinon.assert.notCalled(hStub.redirect);
        });
    });

    it('returns 500 if authenticator fails to deauthenticate.', async () => {
      const request = requestFixture();

      const failureReason = Boom.forbidden();
      serverStub.plugins.security.deauthenticate
        .withArgs(request)
        .returns(Promise.resolve(DeauthenticationResult.failed(failureReason)));

      return logoutRoute
        .handler(request, hStub)
        .catch((response) => {
          expect(response).to.be(Boom.boomify(failureReason));
          sinon.assert.notCalled(hStub.redirect);
        });
    });

    it('returns 400 for AJAX requests that can not handle redirect.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      return logoutRoute
        .handler(request, hStub)
        .catch((response) => {
          expect(response.isBoom).to.be(true);
          expect(response.message).to.be('Client should be able to process redirect response.');
          expect(response.output.statusCode).to.be(400);
          sinon.assert.notCalled(hStub.redirect);
        });
    });

    it('redirects user to the URL returned by authenticator.', async () => {
      const request = requestFixture();

      serverStub.plugins.security.deauthenticate
        .withArgs(request)
        .returns(
          Promise.resolve(DeauthenticationResult.redirectTo('https://custom.logout'))
        );

      await logoutRoute.handler(request, hStub);

      sinon.assert.calledOnce(hStub.redirect);
      sinon.assert.calledWithExactly(hStub.redirect, 'https://custom.logout');
    });

    it('redirects user to the base path if deauthentication succeeds.', async () => {
      const request = requestFixture();

      serverStub.plugins.security.deauthenticate
        .withArgs(request)
        .returns(Promise.resolve(DeauthenticationResult.succeeded()));

      await logoutRoute.handler(request, hStub);

      sinon.assert.calledOnce(hStub.redirect);
      sinon.assert.calledWithExactly(hStub.redirect, '/test-base-path/');
    });

    it('redirects user to the base path if deauthentication is not handled.', async () => {
      const request = requestFixture();

      serverStub.plugins.security.deauthenticate
        .withArgs(request)
        .returns(Promise.resolve(DeauthenticationResult.notHandled()));

      await logoutRoute.handler(request, hStub);

      sinon.assert.calledOnce(hStub.redirect);
      sinon.assert.calledWithExactly(hStub.redirect, '/test-base-path/');
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
      const response = await meRoute.handler(request, hStub);

      expect(response).to.eql({ username: 'user' });
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
          payload: Joi.object({
            SAMLResponse: Joi.string().required(),
            RelayState: Joi.string().allow('')
          })
        }
      });
    });

    it('returns 500 if authentication throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      serverStub.plugins.security.authenticate.throws(unhandledException);

      const response = await samlAcsRoute.handler(request, hStub);

      sinon.assert.notCalled(hStub.redirect);
      expect(response.isBoom).to.be(true);
      expect(response.output.payload).to.eql({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An internal server error occurred'
      });
    });

    it('returns 401 if authentication fails.', async () => {
      const failureReason = new Error('Something went wrong.');
      serverStub.plugins.security.authenticate.returns(
        Promise.resolve(AuthenticationResult.failed(failureReason))
      );

      const response = await samlAcsRoute.handler(request, hStub);

      sinon.assert.notCalled(hStub.redirect);
      expect(response.isBoom).to.be(true);
      expect(response.message).to.be(failureReason.message);
      expect(response.output.statusCode).to.be(401);
    });

    it('returns 401 if authentication is not handled.', async () => {
      serverStub.plugins.security.authenticate.returns(
        Promise.resolve(AuthenticationResult.notHandled())
      );

      const response = await samlAcsRoute.handler(request, hStub);

      sinon.assert.notCalled(hStub.redirect);
      expect(response.isBoom).to.be(true);
      expect(response.message).to.be('Unauthorized');
      expect(response.output.statusCode).to.be(401);
    });

    it('returns 401 if authentication completes with unexpected result.', async () => {
      serverStub.plugins.security.authenticate.returns(
        Promise.resolve(AuthenticationResult.succeeded({}))
      );

      const response = await samlAcsRoute.handler(request, hStub);

      sinon.assert.notCalled(hStub.redirect);
      expect(response.isBoom).to.be(true);
      expect(response.message).to.be('Unauthorized');
      expect(response.output.statusCode).to.be(401);
    });

    it('redirects if required by the authentication process.', async () => {
      serverStub.plugins.security.authenticate.returns(
        Promise.resolve(AuthenticationResult.redirectTo('http://redirect-to/path'))
      );

      await samlAcsRoute.handler(request, hStub);

      sinon.assert.calledWithExactly(hStub.redirect, 'http://redirect-to/path');
    });
  });
});
