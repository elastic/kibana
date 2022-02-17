/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMount } from 'src/core/public';
import { coreMock, scopedHistoryMock, themeServiceMock } from 'src/core/public/mocks';

import { logoutApp } from './logout_app';

describe('logoutApp', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: { clear: jest.fn() },
      writable: true,
    });
    Object.defineProperty(window, 'location', {
      value: { href: 'https://some-host/bar?arg=true', search: '?arg=true' },
      writable: true,
    });
  });

  it('properly registers application', () => {
    const coreSetupMock = coreMock.createSetup();

    logoutApp.create(coreSetupMock);

    expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledTimes(1);
    expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledWith('/logout');

    expect(coreSetupMock.application.register).toHaveBeenCalledTimes(1);

    const [[appRegistration]] = coreSetupMock.application.register.mock.calls;
    expect(appRegistration).toEqual({
      id: 'security_logout',
      chromeless: true,
      appRoute: '/logout',
      title: 'Logout',
      mount: expect.any(Function),
    });
  });

  it('properly mounts application', async () => {
    const coreSetupMock = coreMock.createSetup({ basePath: '/mock-base-path' });
    const containerMock = document.createElement('div');

    logoutApp.create(coreSetupMock);

    const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
    await (mount as AppMount)({
      element: containerMock,
      appBasePath: '',
      onAppLeave: jest.fn(),
      setHeaderActionMenu: jest.fn(),
      history: scopedHistoryMock.create(),
      theme$: themeServiceMock.createTheme$(),
    });

    expect(window.sessionStorage.clear).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/mock-base-path/api/security/logout?arg=true');
  });
});
