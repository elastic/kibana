/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SessionExpired } from './session_expired';

describe('#logout', () => {
  const { location } = window;
  const mockGetItem = jest.fn().mockReturnValue(null);
  const CURRENT_URL = '/foo/bar?baz=quz#quuz';
  const LOGOUT_URL = '/logout';
  const TENANT = '/some-basepath';

  beforeAll(() => {
    // https://remarkablemark.org/blog/2018/11/17/mock-window-location/
    delete window.location;
    (window as any).location = { assign: jest.fn() };
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: mockGetItem,
      },
      writable: true,
    });
  });

  beforeEach(() => {
    (window as any).location = {
      pathname: CURRENT_URL,
      assign: jest.fn(),
      search: '',
      hash: '',
    };
    mockGetItem.mockReset();
  });

  afterAll(() => {
    delete (window as any).sessionStorage;
    window.location = location;
  });

  it(`redirects user to the logout URL with 'msg' and 'next' parameters`, async () => {
    const sessionExpired = new SessionExpired(LOGOUT_URL, TENANT);
    sessionExpired.logout();

    const next = `&next=${encodeURIComponent(CURRENT_URL)}`;
    await expect(window.location.assign).toHaveBeenCalledWith(
      `${LOGOUT_URL}?msg=SESSION_EXPIRED${next}`
    );
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
    await expect(window.location.assign).toBeCalledWith(
      `${LOGOUT_URL}?msg=SESSION_EXPIRED${next}${provider}`
    );
  });
});
