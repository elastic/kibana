/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./account_management_page');

import type { AppMount } from 'src/core/public';
import { AppNavLinkStatus } from 'src/core/public';
import { coreMock, scopedHistoryMock, themeServiceMock } from 'src/core/public/mocks';

import { UserAPIClient } from '../management';
import { securityMock } from '../mocks';
import { accountManagementApp } from './account_management_app';

describe('accountManagementApp', () => {
  it('properly registers application', () => {
    const coreSetupMock = coreMock.createSetup();

    accountManagementApp.create({
      application: coreSetupMock.application,
      getStartServices: coreSetupMock.getStartServices,
      authc: securityMock.createSetup().authc,
    });

    expect(coreSetupMock.application.register).toHaveBeenCalledTimes(1);

    const [[appRegistration]] = coreSetupMock.application.register.mock.calls;
    expect(appRegistration).toEqual({
      id: 'security_account',
      appRoute: '/security/account',
      navLinkStatus: AppNavLinkStatus.hidden,
      title: 'Account Management',
      mount: expect.any(Function),
    });
  });

  it('properly sets breadcrumbs and renders application', async () => {
    const coreSetupMock = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, {}, {}]);

    const authcMock = securityMock.createSetup().authc;

    accountManagementApp.create({
      application: coreSetupMock.application,
      getStartServices: coreSetupMock.getStartServices,
      authc: authcMock,
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

    expect(coreStartMock.chrome.setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(coreStartMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Account Management' },
    ]);

    const mockRenderApp = jest.requireMock('./account_management_page').renderAccountManagementPage;
    expect(mockRenderApp).toHaveBeenCalledTimes(1);
    expect(mockRenderApp).toHaveBeenCalledWith(
      coreStartMock.i18n,
      { element: appMountParams.element, theme$: appMountParams.theme$ },
      {
        userAPIClient: expect.any(UserAPIClient),
        authc: authcMock,
        notifications: coreStartMock.notifications,
      }
    );
  });
});
