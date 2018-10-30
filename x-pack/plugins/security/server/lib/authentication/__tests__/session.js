/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';

import { serverFixture } from '../../__tests__/__fixtures__/server';
import { Session } from '../session';

describe('Session', () => {
  const sandbox = sinon.createSandbox();

  let server;
  let config;

  beforeEach(() => {
    server = serverFixture();
    config = { get: sinon.stub() };

    server.config.returns(config);

    sandbox.useFakeTimers();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('correctly setups Hapi plugin.', async () => {
      config.get.withArgs('xpack.security.cookieName').returns('cookie-name');
      config.get.withArgs('xpack.security.encryptionKey').returns('encryption-key');
      config.get.withArgs('xpack.security.secureCookies').returns('secure-cookies');
      config.get.withArgs('server.basePath').returns('base/path');

      await Session.create(server);

      sinon.assert.calledOnce(server.auth.strategy);
      sinon.assert.calledWithExactly(server.auth.strategy, 'security-cookie', 'cookie', {
        cookie: 'cookie-name',
        password: 'encryption-key',
        clearInvalid: true,
        validateFunc: sinon.match.func,
        isHttpOnly: true,
        isSecure: 'secure-cookies',
        isSameSite: false,
        path: 'base/path/'
      });
    });
  });

  describe('`get` method', () => {
    let session;
    beforeEach(async () => {
      session = await Session.create(server);
    });

    it('fails if request is not provided.', async () => {
      try {
        await session.get();
        expect().fail('`get` should fail.');
      } catch(err) {
        expect(err).to.be.a(Error);
        expect(err.message).to.be('Request should be a valid object, was [undefined].');
      }
    });

    it('logs the reason of validation function failure.', async () => {
      const request = {};
      const failureReason = new Error('Invalid cookie.');
      server.auth.test.withArgs('security-cookie', request).rejects(failureReason);

      expect(await session.get(request)).to.be(null);
      sinon.assert.calledOnce(server.log);
      sinon.assert.calledWithExactly(server.log, ['debug', 'security', 'auth', 'session'], failureReason);
    });

    it('returns null if multiple session cookies are detected.', async () => {
      const request = {};
      const sessions = [{ value: { token: 'token' } }, { value: { token: 'token' } }];
      server.auth.test.withArgs('security-cookie', request).resolves(sessions);

      expect(await session.get(request)).to.be(null);
    });

    it('returns what validation function returns', async () => {
      const request = {};
      const rawSessionValue = { value: { token: 'token' } };
      server.auth.test.withArgs('security-cookie', request).resolves(rawSessionValue);

      expect(await session.get(request)).to.be.eql(rawSessionValue.value);
    });

    it('correctly process session expiration date', async () => {
      const { validateFunc } = server.auth.strategy.firstCall.args[2];
      const currentTime = 100;

      sandbox.clock.tick(currentTime);

      const sessionWithoutExpires = { token: 'token' };
      let result = validateFunc({}, sessionWithoutExpires);

      expect(result.valid).to.be(true);

      const notExpiredSession = { token: 'token', expires: currentTime + 1 };
      result = validateFunc({}, notExpiredSession);

      expect(result.valid).to.be(true);

      const expiredSession = { token: 'token', expires: currentTime - 1 };
      result = validateFunc({}, expiredSession);

      expect(result.valid).to.be(false);
    });
  });

  describe('`set` method', () => {
    let session;
    beforeEach(async () => {
      session = await Session.create(server);
    });

    it('fails if request is not provided.', async () => {
      try {
        await session.set();
        expect().fail('`set` should fail.');
      } catch(err) {
        expect(err).to.be.a(Error);
        expect(err.message).to.be('Request should be a valid object, was [undefined].');
      }
    });

    it('does not set expires if corresponding config value is not specified.', async () => {
      const sessionValue = { token: 'token' };
      const request = { cookieAuth: { set: sinon.stub() } };

      await session.set(request, sessionValue);

      sinon.assert.calledOnce(request.cookieAuth.set);
      sinon.assert.calledWithExactly(request.cookieAuth.set, {
        value: sessionValue,
        expires: undefined
      });
    });

    it('sets expires based on corresponding config value.', async () => {
      const sessionValue = { token: 'token' };
      const request = { cookieAuth: { set: sinon.stub() } };

      config.get.withArgs('xpack.security.sessionTimeout').returns(100);
      sandbox.clock.tick(1000);

      const sessionWithTimeout = await Session.create(server);
      await sessionWithTimeout.set(request, sessionValue);

      sinon.assert.calledOnce(request.cookieAuth.set);
      sinon.assert.calledWithExactly(request.cookieAuth.set, {
        value: sessionValue,
        expires: 1100
      });
    });
  });

  describe('`clear` method', () => {
    let session;
    beforeEach(async () => {
      session = await Session.create(server);
    });

    it('fails if request is not provided.', async () => {
      try {
        await session.clear();
        expect().fail('`clear` should fail.');
      } catch(err) {
        expect(err).to.be.a(Error);
        expect(err.message).to.be('Request should be a valid object, was [undefined].');
      }
    });

    it('correctly clears cookie', async () => {
      const request = { cookieAuth: { clear: sinon.stub() } };

      await session.clear(request);

      sinon.assert.calledOnce(request.cookieAuth.clear);
    });
  });
});
