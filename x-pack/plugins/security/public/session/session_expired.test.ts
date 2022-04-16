/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock } from '@kbn/core/public/mocks';

import { LogoutReason } from '../../common/types';
import { SessionExpired } from './session_expired';

describe('#logout', () => {
  const application = applicationServiceMock.createStartContract();
  const mockGetItem = jest.fn().mockReturnValue(null);
  const CURRENT_URL = '/foo/bar?baz=quz#quuz';
  const LOGOUT_URL = '/logout';
  const TENANT = '/some-basepath';

  beforeAll(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: mockGetItem,
      },
      writable: true,
    });
  });

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        pathname: CURRENT_URL,
        search: '',
        hash: '',
      },
      configurable: true,
    });
    application.navigateToUrl.mockClear();
    mockGetItem.mockReset();
  });

  afterAll(() => {
    delete (window as any).sessionStorage;
  });

  it(`redirects user to the logout URL with 'msg' and 'next' parameters`, async () => {
    const sessionExpired = new SessionExpired(application, LOGOUT_URL, TENANT);
    sessionExpired.logout(LogoutReason.SESSION_EXPIRED);

    const next = `&next=${encodeURIComponent(CURRENT_URL)}`;
    await expect(application.navigateToUrl).toHaveBeenCalledWith(
      `${LOGOUT_URL}?msg=SESSION_EXPIRED${next}`,
      { forceRedirect: true, skipAppLeave: true }
    );
  });

  it(`redirects user to the logout URL with custom reason 'msg'`, async () => {
    const sessionExpired = new SessionExpired(application, LOGOUT_URL, TENANT);
    sessionExpired.logout(LogoutReason.AUTHENTICATION_ERROR);

    const next = `&next=${encodeURIComponent(CURRENT_URL)}`;
    await expect(application.navigateToUrl).toHaveBeenCalledWith(
      `${LOGOUT_URL}?msg=AUTHENTICATION_ERROR${next}`,
      { forceRedirect: true, skipAppLeave: true }
    );
  });

  it(`adds 'provider' parameter when sessionStorage contains the provider name for this tenant`, async () => {
    const providerName = 'basic';
    mockGetItem.mockReturnValueOnce(providerName);

    const sessionExpired = new SessionExpired(application, LOGOUT_URL, TENANT);
    sessionExpired.logout(LogoutReason.SESSION_EXPIRED);

    expect(mockGetItem).toHaveBeenCalledTimes(1);
    expect(mockGetItem).toHaveBeenCalledWith(`${TENANT}/session_provider`);

    const next = `&next=${encodeURIComponent(CURRENT_URL)}`;
    const provider = `&provider=${providerName}`;
    await expect(application.navigateToUrl).toBeCalledWith(
      `${LOGOUT_URL}?msg=SESSION_EXPIRED${next}${provider}`,
      { forceRedirect: true, skipAppLeave: true }
    );
  });
});
