/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import sinon from 'sinon';

import { replyFixture } from './__fixtures__/reply';
import { requestFixture } from './__fixtures__/request';
import { serverFixture } from './__fixtures__/server';

import { AuthenticationResult } from '../authentication/authentication_result';
import { authenticateFactory } from '../auth_redirect';

describe('lib/auth_redirect', function () {
  let authenticate;
  let request;
  let reply;
  let err;
  let credentials;
  let server;

  beforeEach(() => {
    request = requestFixture();
    reply = replyFixture();
    err = new Error();
    credentials = {};
    server = serverFixture();

    server.plugins.xpack_main.info
      .isAvailable.returns(true);
    server.plugins.xpack_main.info
      .feature.returns({ isEnabled: sinon.stub().returns(true) });
    server.plugins.xpack_main.info
      .license.isOneOf.returns(false);

    authenticate = authenticateFactory(server);
  });

  it('invokes `authenticate` with request', async () => {
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.succeeded(credentials))
    );

    await authenticate(request, reply);

    sinon.assert.calledWithExactly(server.plugins.security.authenticate, request);
  });

  it('continues request with credentials on success', async () => {
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.succeeded(credentials))
    );

    await authenticate(request, reply);

    sinon.assert.calledWith(reply.continue, { credentials });
    sinon.assert.notCalled(reply.redirect);
    sinon.assert.notCalled(reply);
  });

  it('redirects user if redirection is requested by the authenticator', async () => {
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.redirectTo('/some/url'))
    );

    await authenticate(request, reply);

    sinon.assert.calledWithExactly(reply.redirect, '/some/url');
    sinon.assert.notCalled(reply.continue);
    sinon.assert.notCalled(reply);
  });

  it('returns `Internal Server Error` when `authenticate` throws unhandled exception', async () => {
    server.plugins.security.authenticate
      .withArgs(request)
      .returns(Promise.reject(err));

    await authenticate(request, reply);

    sinon.assert.calledWithExactly(server.log, ['error', 'authentication'], sinon.match.same(err));
    sinon.assert.calledWithExactly(reply, sinon.match((error) => error.isBoom && error.output.statusCode === 500));
    sinon.assert.notCalled(reply.redirect);
    sinon.assert.notCalled(reply.continue);
  });

  it('returns wrapped original error when `authenticate` fails to authenticate user', async () => {
    const esError = Boom.badRequest('some message');
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.failed(esError))
    );

    await authenticate(request, reply);

    sinon.assert.calledWithExactly(
      server.log,
      ['info', 'authentication'],
      'Authentication attempt failed: some message'
    );
    sinon.assert.calledWithExactly(reply, esError);
    sinon.assert.notCalled(reply.redirect);
    sinon.assert.notCalled(reply.continue);
  });

  it('returns `unauthorized` when authentication can not be handled', async () => {
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.notHandled())
    );

    await authenticate(request, reply);

    sinon.assert.calledWithExactly(reply, Boom.unauthorized());
    sinon.assert.notCalled(reply.redirect);
    sinon.assert.notCalled(reply.continue);
  });

  it('replies with no credentials when security is disabled in elasticsearch', async () => {
    server.plugins.xpack_main.info.feature.returns({ isEnabled: sinon.stub().returns(false) });

    await authenticate(request, reply);

    sinon.assert.calledWith(reply.continue, { credentials: {} });
    sinon.assert.notCalled(reply.redirect);
    sinon.assert.notCalled(reply);
  });

  it('replies with no credentials when license is basic', async () => {
    server.plugins.xpack_main.info.license.isOneOf.returns(true);

    await authenticate(request, reply);

    sinon.assert.calledWith(reply.continue, { credentials: {} });
    sinon.assert.notCalled(reply.redirect);
    sinon.assert.notCalled(reply);
  });
});
