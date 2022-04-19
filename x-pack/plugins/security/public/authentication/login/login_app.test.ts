/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./login_page');

import type { AppMount } from '@kbn/core/public';
import { coreMock, scopedHistoryMock, themeServiceMock } from '@kbn/core/public/mocks';

import { loginApp } from './login_app';

describe('loginApp', () => {
  it('properly registers application', () => {
    const coreSetupMock = coreMock.createSetup();

    loginApp.create({
      ...coreSetupMock,
      config: { loginAssistanceMessage: '', sameSiteCookies: undefined },
    });

    expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledTimes(1);
    expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledWith('/login');

    expect(coreSetupMock.application.register).toHaveBeenCalledTimes(1);

    const [[appRegistration]] = coreSetupMock.application.register.mock.calls;
    expect(appRegistration).toEqual({
      id: 'security_login',
      chromeless: true,
      appRoute: '/login',
      title: 'Login',
      mount: expect.any(Function),
    });
  });

  it('properly renders application', async () => {
    const coreSetupMock = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, {}, {}]);

    loginApp.create({
      ...coreSetupMock,
      config: { loginAssistanceMessage: 'some-message', sameSiteCookies: undefined },
    });

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

    const mockRenderApp = jest.requireMock('./login_page').renderLoginPage;
    expect(mockRenderApp).toHaveBeenCalledTimes(1);
    expect(mockRenderApp).toHaveBeenCalledWith(
      coreStartMock.i18n,
      { element: appMountParams.element, theme$: appMountParams.theme$ },
      {
        http: coreStartMock.http,
        notifications: coreStartMock.notifications,
        fatalErrors: coreStartMock.fatalErrors,
        loginAssistanceMessage: 'some-message',
      }
    );
  });
});
