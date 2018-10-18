/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import iron from 'iron';

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
    server.register.yields();

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
      sinon.assert.calledWithExactly(server.auth.strategy, 'security-cookie', 'cookie', false, {
        cookie: 'cookie-name',
        password: 'encryption-key',
        clearInvalid: true,
        validateFunc: sinon.match.func,
        isHttpOnly: true,
        isSecure: 'secure-cookies',
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
      server.auth.test.withArgs('security-cookie', request, sinon.match.func).yields(
        failureReason
      );

      expect(await session.get(request)).to.be(null);
      sinon.assert.calledOnce(server.log);
      sinon.assert.calledWithExactly(server.log, ['debug', 'security', 'auth', 'session'], failureReason);
    });

    it('returns null if multiple session cookies are detected.', async () => {
      const request = {};
      const sessions = [{ value: { token: 'token' } }, { value: { token: 'token' } }];
      server.auth.test.withArgs('security-cookie', request, sinon.match.func).yields(null, sessions);

      expect(await session.get(request)).to.be(null);
    });

    it('returns what validation function returns', async () => {
      const request = {};
      const rawSessionValue = { value: { token: 'token' } };
      server.auth.test.withArgs('security-cookie', request, sinon.match.func).yields(
        null, rawSessionValue
      );

      expect(await session.get(request)).to.be.eql(rawSessionValue.value);
    });

    it('correctly process session expiration date', async () => {
      const { validateFunc } = server.auth.strategy.firstCall.args[3];
      const currentTime = 100;

      sandbox.clock.tick(currentTime);

      const callback = sinon.stub();
      const sessionWithoutExpires = { token: 'token' };
      validateFunc({}, sessionWithoutExpires, callback);

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, null, true, sessionWithoutExpires);

      callback.resetHistory();
      const notExpiredSession = { token: 'token', expires: currentTime + 1 };
      validateFunc({}, notExpiredSession, callback);

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, null, true, notExpiredSession);

      callback.resetHistory();
      const expiredSession = { token: 'token', expires: currentTime - 1 };
      validateFunc({}, expiredSession, callback);

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, sinon.match.instanceOf(Error), false);
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

  describe('`serialize` method', () => {
    let session;
    beforeEach(async () => {
      config.get.withArgs('xpack.security.cookieName').returns('cookie-name');
      config.get.withArgs('xpack.security.encryptionKey').returns('encryption-key');
      session = await Session.create(server);
    });

    it('returns null if state is null', async () => {
      const request = {
        _states: {
        }
      };

      const returnValue = await session.serialize(request);
      expect(returnValue).to.eql(null);
    });

    it('uses iron to encrypt the state with the set password', async () => {
      const stateValue = {
        foo: 'bar'
      };
      const request = {
        _states: {
          'cookie-name': {
            value: stateValue,
          }
        }
      };

      sandbox.stub(iron, 'seal')
        .withArgs(stateValue, 'encryption-key', iron.defaults)
        .callsArgWith(3, null, 'serialized-value');

      const returnValue = await session.serialize(request);
      expect(returnValue).to.eql('serialized-value');
    });

    it(`rejects if iron can't seal the session`, async () => {
      const stateValue = {
        foo: 'bar'
      };
      const request = {
        _states: {
          'cookie-name': {
            value: stateValue,
          }
        }
      };

      sandbox.stub(iron, 'seal')
        .withArgs(stateValue, 'encryption-key', iron.defaults)
        .callsArgWith(3, new Error('IDK'), null);

      try {
        await session.serialize(request);
        expect().fail('`serialize` should fail.');
      } catch(err) {
        expect(err).to.be.a(Error);
        expect(err.message).to.be('IDK');
      }
    });
  });

  describe('`getCookieOptions` method', () => {
    let session;
    beforeEach(async () => {
      config.get.withArgs('xpack.security.cookieName').returns('cookie-name');
      config.get.withArgs('xpack.security.secureCookies').returns('secure-cookies');
      config.get.withArgs('server.basePath').returns('base/path');
      session = await Session.create(server);
    });

    it('returns cookie options', () => {
      expect(session.getCookieOptions()).to.eql({
        name: 'cookie-name',
        path: 'base/path/',
        httpOnly: true,
        secure: 'secure-cookies'
      });
    });
  });
});
