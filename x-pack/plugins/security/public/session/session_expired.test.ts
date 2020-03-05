/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SessionExpired } from './session_expired';

describe('#logout', () => {
  const mockGetItem = jest.fn().mockReturnValue(null);
  const CURRENT_URL = '/foo/bar?baz=quz#quuz';
  const LOGOUT_URL = '/logout';
  const TENANT = '/some-basepath';

  let newUrlPromise: Promise<string>;

  beforeAll(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: mockGetItem,
      },
      writable: true,
    });
  });

  beforeEach(() => {
    window.history.pushState({}, '', CURRENT_URL);
    mockGetItem.mockReset();
    newUrlPromise = new Promise<string>(resolve => {
      jest.spyOn(window.location, 'assign').mockImplementation(url => {
        resolve(url);
      });
    });
  });

  afterAll(() => {
    delete (window as any).sessionStorage;
  });

  it(`redirects user to the logout URL with 'msg' and 'next' parameters`, async () => {
    const sessionExpired = new SessionExpired(LOGOUT_URL, TENANT);
    sessionExpired.logout();

    const next = `&next=${encodeURIComponent(CURRENT_URL)}`;
    await expect(newUrlPromise).resolves.toBe(`${LOGOUT_URL}?msg=SESSION_EXPIRED${next}`);
  });

  it(`adds 'provider' parameter when sessionStorage contains the provider name for this tenant`, async () => {
    const providerName = 'basic';
    mockGetItem.mockReturnValueOnce(providerName);

    const sessionExpired = new SessionExpired(LOGOUT_URL, TENANT);
    sessionExpired.logout();

    expect(mockGetItem).toHaveBeenCalledTimes(1);
    expect(mockGetItem).toHaveBeenCalledWith(`${TENANT}/session_provider`);

    const next = `&next=${encodeURIComponent(CURRENT_URL)}`;
    const provider = `&provider=${providerName}`;
    await expect(newUrlPromise).resolves.toBe(
      `${LOGOUT_URL}?msg=SESSION_EXPIRED${next}${provider}`
    );
  });
});
