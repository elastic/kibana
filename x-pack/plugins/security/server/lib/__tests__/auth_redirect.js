/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import expect from '@kbn/expect';
import sinon from 'sinon';

import { hFixture } from './__fixtures__/h';
import { requestFixture } from './__fixtures__/request';
import { serverFixture } from './__fixtures__/server';

import { AuthenticationResult } from '../authentication/authentication_result';
import { authenticateFactory } from '../auth_redirect';

describe('lib/auth_redirect', function () {
  let authenticate;
  let request;
  let h;
  let err;
  let credentials;
  let server;

  beforeEach(() => {
    request = requestFixture();
    h = hFixture();
    err = new Error();
    credentials = {};
    server = serverFixture();

    server.plugins.xpack_main.info
      .isAvailable.returns(true);
    server.plugins.xpack_main.info
      .feature.returns({ isEnabled: sinon.stub().returns(true) });

    authenticate = authenticateFactory(server);
  });

  it('invokes `authenticate` with request', async () => {
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.succeeded(credentials))
    );

    await authenticate(request, h);

    sinon.assert.calledWithExactly(server.plugins.security.authenticate, request);
  });

  it('continues request with credentials on success', async () => {
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.succeeded(credentials))
    );

    await authenticate(request, h);

    sinon.assert.calledWith(h.authenticated, { credentials });
    sinon.assert.notCalled(h.redirect);
  });

  it('redirects user if redirection is requested by the authenticator', async () => {
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.redirectTo('/some/url'))
    );

    await authenticate(request, h);

    sinon.assert.calledWithExactly(h.redirect, '/some/url');
    sinon.assert.called(h.takeover);
    sinon.assert.notCalled(h.authenticated);
  });

  it('returns `Internal Server Error` when `authenticate` throws unhandled exception', async () => {
    server.plugins.security.authenticate
      .withArgs(request)
      .returns(Promise.reject(err));

    const response = await authenticate(request, h);

    sinon.assert.calledWithExactly(server.log, ['error', 'authentication'], sinon.match.same(err));
    expect(response.isBoom).to.be(true);
    expect(response.output.statusCode).to.be(500);
    sinon.assert.notCalled(h.redirect);
    sinon.assert.notCalled(h.authenticated);
  });

  it('returns wrapped original error when `authenticate` fails to authenticate user', async () => {
    const esError = Boom.badRequest('some message');
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.failed(esError))
    );

    const response = await authenticate(request, h);

    sinon.assert.calledWithExactly(
      server.log,
      ['info', 'authentication'],
      'Authentication attempt failed: some message'
    );
    expect(response).to.eql(esError);
    sinon.assert.notCalled(h.redirect);
    sinon.assert.notCalled(h.authenticated);
  });

  it('includes `WWW-Authenticate` header if `authenticate` fails to authenticate user and provides challenges', async () => {
    const originalEsError = Boom.unauthorized('some message');
    originalEsError.output.headers['WWW-Authenticate'] = [
      'Basic realm="Access to prod", charset="UTF-8"',
      'Basic',
      'Negotiate'
    ];

    server.plugins.security.authenticate.withArgs(request).resolves(
      AuthenticationResult.failed(originalEsError, ['Negotiate'])
    );

    const response = await authenticate(request, h);

    sinon.assert.calledWithExactly(
      server.log,
      ['info', 'authentication'],
      'Authentication attempt failed: some message'
    );
    expect(response.message).to.eql(originalEsError.message);
    expect(response.output.headers).to.eql({ 'WWW-Authenticate': ['Negotiate'] });
    sinon.assert.notCalled(h.redirect);
    sinon.assert.notCalled(h.authenticated);
  });

  it('returns `unauthorized` when authentication can not be handled', async () => {
    server.plugins.security.authenticate.withArgs(request).returns(
      Promise.resolve(AuthenticationResult.notHandled())
    );

    const response = await authenticate(request, h);

    expect(response.isBoom).to.be(true);
    expect(response.message).to.be('Unauthorized');
    expect(response.output.statusCode).to.be(401);
    sinon.assert.notCalled(h.redirect);
    sinon.assert.notCalled(h.authenticated);
  });

  it('replies with no credentials when security is disabled in elasticsearch', async () => {
    server.plugins.xpack_main.info.feature.returns({ isEnabled: sinon.stub().returns(false) });

    await authenticate(request, h);

    sinon.assert.calledWith(h.authenticated, { credentials: {} });
    sinon.assert.notCalled(h.redirect);
  });

});
