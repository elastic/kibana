/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/public/mocks';
import { SessionExpired } from './session_expired';

describe('Session Expiration', () => {
  const mockGetItem = jest.fn().mockReturnValue(null);

  beforeAll(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: mockGetItem,
      },
      writable: true,
    });
  });

  afterAll(() => {
    delete (window as any).sessionStorage;
  });

  describe('logout', () => {
    const mockCurrentUrl = (url: string) => window.history.pushState({}, '', url);
    const tenant = '';

    it('redirects user to "/logout" when there is no basePath', async () => {
      const { basePath } = coreMock.createSetup().http;
      mockCurrentUrl('/foo/bar?baz=quz#quuz');
      const sessionExpired = new SessionExpired(basePath, tenant);
      const newUrlPromise = new Promise<string>(resolve => {
        jest.spyOn(window.location, 'assign').mockImplementation(url => {
          resolve(url);
        });
      });

      sessionExpired.logout();

      const url = await newUrlPromise;
      expect(url).toBe(
        `/logout?next=${encodeURIComponent('/foo/bar?baz=quz#quuz')}&msg=SESSION_EXPIRED`
      );
    });

    it('adds a provider parameter when an auth provider is saved in sessionStorage', async () => {
      const { basePath } = coreMock.createSetup().http;
      mockCurrentUrl('/foo/bar?baz=quz#quuz');
      const sessionExpired = new SessionExpired(basePath, tenant);
      const newUrlPromise = new Promise<string>(resolve => {
        jest.spyOn(window.location, 'assign').mockImplementation(url => {
          resolve(url);
        });
      });
      mockGetItem.mockReturnValueOnce('basic');

      sessionExpired.logout();

      const url = await newUrlPromise;
      expect(url).toBe(
        `/logout?next=${encodeURIComponent(
          '/foo/bar?baz=quz#quuz'
        )}&msg=SESSION_EXPIRED&provider=basic`
      );
    });

    it('redirects user to "/${basePath}/logout" and removes basePath from next parameter when there is a basePath', async () => {
      const { basePath } = coreMock.createSetup({ basePath: '/foo' }).http;
      mockCurrentUrl('/foo/bar?baz=quz#quuz');
      const sessionExpired = new SessionExpired(basePath, tenant);
      const newUrlPromise = new Promise<string>(resolve => {
        jest.spyOn(window.location, 'assign').mockImplementation(url => {
          resolve(url);
        });
      });

      sessionExpired.logout();

      const url = await newUrlPromise;
      expect(url).toBe(
        `/foo/logout?next=${encodeURIComponent('/bar?baz=quz#quuz')}&msg=SESSION_EXPIRED`
      );
    });
  });
});
