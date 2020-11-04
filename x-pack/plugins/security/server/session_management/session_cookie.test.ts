/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SessionStorage } from '../../../../../src/core/server';
import { SessionCookie, SessionCookieOptions } from './session_cookie';

import {
  loggingSystemMock,
  httpServiceMock,
  sessionStorageMock,
  httpServerMock,
} from '../../../../../src/core/server/mocks';
import { sessionCookieMock } from './session_cookie.mock';

describe('Session cookie', () => {
  let sessionCookieOptions: SessionCookieOptions;
  let sessionCookie: SessionCookie;
  let mockSessionStorageFactory: ReturnType<typeof sessionStorageMock.createFactory>;
  let mockSessionStorage: jest.Mocked<SessionStorage<any>>;
  beforeEach(() => {
    const config = {
      encryptionKey: 'ab'.repeat(16),
      secureCookies: true,
      cookieName: 'my-sid-cookie',
      sameSiteCookies: 'Strict' as 'Strict',
    };

    const httpSetupMock = httpServiceMock.createSetupContract();
    mockSessionStorage = sessionStorageMock.create();
    mockSessionStorageFactory = sessionStorageMock.createFactory();
    mockSessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
    httpSetupMock.createCookieSessionStorageFactory.mockResolvedValue(mockSessionStorageFactory);

    sessionCookieOptions = {
      logger: loggingSystemMock.createLogger(),
      serverBasePath: '/mock-base-path',
      config,
      createCookieSessionStorageFactory: httpSetupMock.createCookieSessionStorageFactory,
    };

    sessionCookie = new SessionCookie(sessionCookieOptions);
  });

  describe('#constructor', () => {
    it('properly creates CookieSessionStorageFactory', () => {
      expect(sessionCookieOptions.createCookieSessionStorageFactory).toHaveBeenCalledTimes(1);
      expect(sessionCookieOptions.createCookieSessionStorageFactory).toHaveBeenCalledWith({
        encryptionKey: sessionCookieOptions.config.encryptionKey,
        isSecure: sessionCookieOptions.config.secureCookies,
        name: sessionCookieOptions.config.cookieName,
        sameSite: sessionCookieOptions.config.sameSiteCookies,
        validate: expect.any(Function),
      });
    });

    it('cookie validator properly handles cookies with different base path', () => {
      const [
        [{ validate }],
      ] = (sessionCookieOptions.createCookieSessionStorageFactory as jest.Mock).mock.calls;

      expect(
        validate(sessionCookieMock.createValue({ path: sessionCookieOptions.serverBasePath }))
      ).toEqual({ isValid: true });

      expect(
        validate([
          sessionCookieMock.createValue({ path: sessionCookieOptions.serverBasePath }),
          sessionCookieMock.createValue({ path: sessionCookieOptions.serverBasePath }),
        ])
      ).toEqual({ isValid: true });

      expect(validate(sessionCookieMock.createValue({ path: '/some-old-path' }))).toEqual({
        isValid: false,
        path: '/some-old-path',
      });

      expect(
        validate([
          sessionCookieMock.createValue({ path: sessionCookieOptions.serverBasePath }),
          sessionCookieMock.createValue({ path: '/some-old-path' }),
        ])
      ).toEqual({ isValid: false, path: '/some-old-path' });
    });
  });

  describe('#get', () => {
    it('returns `null` if session storage returns `null`', async () => {
      mockSessionStorage.get.mockResolvedValue(null);

      const request = httpServerMock.createKibanaRequest();
      await expect(sessionCookie.get(request)).resolves.toBeNull();

      expect(mockSessionStorageFactory.asScoped).toHaveBeenCalledWith(request);
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('returns value if session is in compatible format', async () => {
      const sessionValue = sessionCookieMock.createValue();
      mockSessionStorage.get.mockResolvedValue(sessionValue);

      const request = httpServerMock.createKibanaRequest();
      await expect(sessionCookie.get(request)).resolves.toBe(sessionValue);

      expect(mockSessionStorageFactory.asScoped).toHaveBeenCalledWith(request);
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('returns `null` and clears session value if it is in incompatible format', async () => {
      const invalidValue = sessionCookieMock.createValue();
      // @ts-expect-error
      delete invalidValue.sid;

      mockSessionStorage.get.mockResolvedValue(invalidValue);

      const request = httpServerMock.createKibanaRequest();
      await expect(sessionCookie.get(request)).resolves.toBeNull();

      expect(mockSessionStorageFactory.asScoped).toHaveBeenCalledWith(request);
      expect(mockSessionStorage.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('#set', () => {
    it('properly sets value in the session storage', async () => {
      const sessionValue = sessionCookieMock.createValue();

      const request = httpServerMock.createKibanaRequest();
      await sessionCookie.set(request, sessionValue);

      expect(mockSessionStorageFactory.asScoped).toHaveBeenCalledWith(request);
      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...sessionValue,
        path: '/mock-base-path',
      });
    });
  });

  describe('#clear', () => {
    it('properly clears value in the session storage', async () => {
      const request = httpServerMock.createKibanaRequest();
      await sessionCookie.clear(request);

      expect(mockSessionStorageFactory.asScoped).toHaveBeenCalledWith(request);
      expect(mockSessionStorage.clear).toHaveBeenCalledTimes(1);
    });
  });
});
