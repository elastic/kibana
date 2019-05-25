/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { requestFixture } from '../__tests__/__fixtures__/request';
import { serverFixture } from '../__tests__/__fixtures__/server';
import { Session } from './session';

describe('Session', () => {
  const sandbox = sinon.createSandbox();

  let server: ReturnType<typeof serverFixture>;
  let config: { get: sinon.SinonStub };

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

      await Session.create(server as any);

      sinon.assert.calledOnce(server.auth.strategy);
      sinon.assert.calledWithExactly(server.auth.strategy, 'security-cookie', 'cookie', {
        cookie: 'cookie-name',
        password: 'encryption-key',
        clearInvalid: true,
        validateFunc: sinon.match.func,
        isHttpOnly: true,
        isSecure: 'secure-cookies',
        isSameSite: false,
        path: 'base/path/',
      });
    });
  });

  describe('`get` method', () => {
    let session: Session;
    beforeEach(async () => {
      session = await Session.create(server as any);
    });

    it('fails if request is not provided.', async () => {
      await expect(session.get(undefined as any)).rejects.toThrowError(
        'Request should be a valid object, was [undefined].'
      );
    });

    it('logs the reason of validation function failure.', async () => {
      const request = requestFixture();
      const failureReason = new Error('Invalid cookie.');
      server.auth.test.withArgs('security-cookie', request).rejects(failureReason);

      await expect(session.get(request)).resolves.toBeNull();
      sinon.assert.calledOnce(server.log);
      sinon.assert.calledWithExactly(
        server.log,
        ['debug', 'security', 'auth', 'session'],
        failureReason
      );
    });

    it('returns session if single session cookie is in an array.', async () => {
      const request = requestFixture();
      const sessionValue = { token: 'token' };
      const sessions = [{ value: sessionValue }];
      server.auth.test.withArgs('security-cookie', request).resolves(sessions);

      await expect(session.get(request)).resolves.toBe(sessionValue);
    });

    it('returns null if multiple session cookies are detected.', async () => {
      const request = requestFixture();
      const sessions = [{ value: { token: 'token' } }, { value: { token: 'token' } }];
      server.auth.test.withArgs('security-cookie', request).resolves(sessions);

      await expect(session.get(request)).resolves.toBeNull();
    });

    it('returns what validation function returns', async () => {
      const request = requestFixture();
      const rawSessionValue = { value: { token: 'token' } };
      server.auth.test.withArgs('security-cookie', request).resolves(rawSessionValue);

      await expect(session.get(request)).resolves.toEqual(rawSessionValue.value);
    });

    it('correctly process session expiration date', async () => {
      const { validateFunc } = server.auth.strategy.firstCall.args[2];
      const currentTime = 100;

      sandbox.clock.tick(currentTime);

      const sessionWithoutExpires = { token: 'token' };
      let result = validateFunc({}, sessionWithoutExpires);

      expect(result.valid).toBe(true);

      const notExpiredSession = { token: 'token', expires: currentTime + 1 };
      result = validateFunc({}, notExpiredSession);

      expect(result.valid).toBe(true);

      const expiredSession = { token: 'token', expires: currentTime - 1 };
      result = validateFunc({}, expiredSession);

      expect(result.valid).toBe(false);
    });
  });

  describe('`set` method', () => {
    let session: Session;
    beforeEach(async () => {
      session = await Session.create(server as any);
    });

    it('fails if request is not provided.', async () => {
      await expect(session.set(undefined as any, undefined as any)).rejects.toThrowError(
        'Request should be a valid object, was [undefined].'
      );
    });

    it('does not set expires if corresponding config value is not specified.', async () => {
      const sessionValue = { token: 'token' };
      const request = requestFixture();

      await session.set(request, sessionValue);

      sinon.assert.calledOnce(request.cookieAuth.set);
      sinon.assert.calledWithExactly(request.cookieAuth.set, {
        value: sessionValue,
        expires: undefined,
      });
    });

    it('sets expires based on corresponding config value.', async () => {
      const sessionValue = { token: 'token' };
      const request = requestFixture();

      config.get.withArgs('xpack.security.sessionTimeout').returns(100);
      sandbox.clock.tick(1000);

      const sessionWithTimeout = await Session.create(server as any);
      await sessionWithTimeout.set(request, sessionValue);

      sinon.assert.calledOnce(request.cookieAuth.set);
      sinon.assert.calledWithExactly(request.cookieAuth.set, {
        value: sessionValue,
        expires: 1100,
      });
    });
  });

  describe('`clear` method', () => {
    let session: Session;
    beforeEach(async () => {
      session = await Session.create(server as any);
    });

    it('fails if request is not provided.', async () => {
      await expect(session.clear(undefined as any)).rejects.toThrowError(
        'Request should be a valid object, was [undefined].'
      );
    });

    it('correctly clears cookie', async () => {
      const request = requestFixture();

      await session.clear(request);

      sinon.assert.calledOnce(request.cookieAuth.clear);
    });
  });
});
