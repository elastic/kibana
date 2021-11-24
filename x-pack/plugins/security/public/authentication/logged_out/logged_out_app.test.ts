/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./logged_out_page');

import type { AppMount } from 'src/core/public';
import { coreMock, scopedHistoryMock, themeServiceMock } from 'src/core/public/mocks';

import { loggedOutApp } from './logged_out_app';

describe('loggedOutApp', () => {
  it('properly registers application', () => {
    const coreSetupMock = coreMock.createSetup();

    loggedOutApp.create(coreSetupMock);

    expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledTimes(1);
    expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledWith('/security/logged_out');

    expect(coreSetupMock.application.register).toHaveBeenCalledTimes(1);

    const [[appRegistration]] = coreSetupMock.application.register.mock.calls;
    expect(appRegistration).toEqual({
      id: 'security_logged_out',
      chromeless: true,
      appRoute: '/security/logged_out',
      title: 'Logged out',
      mount: expect.any(Function),
    });
  });

  it('properly renders application', async () => {
    const coreSetupMock = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, {}, {}]);

    loggedOutApp.create(coreSetupMock);

    const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
    const appMountParams = {
      element: document.createElement('div'),
      appBasePath: '',
      onAppLeave: jest.fn(),
      setHeaderActionMenu: jest.fn(),
      history: scopedHistoryMock.create(),
      theme$: themeServiceMock.createTheme$(),
    };
    await (mount as AppMount)(appMountParams);

    const mockRenderApp = jest.requireMock('./logged_out_page').renderLoggedOutPage;
    expect(mockRenderApp).toHaveBeenCalledTimes(1);
    expect(mockRenderApp).toHaveBeenCalledWith(
      coreStartMock.i18n,
      { element: appMountParams.element, theme$: appMountParams.theme$ },
      { basePath: coreStartMock.http.basePath }
    );
  });
});
