/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./account_management_page');

import { AppMount, AppNavLinkStatus } from 'src/core/public';
import { UserAPIClient } from '../management';
import { accountManagementApp } from './account_management_app';

import { coreMock, scopedHistoryMock } from '../../../../../src/core/public/mocks';
import { securityMock } from '../mocks';

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
    const containerMock = document.createElement('div');

    accountManagementApp.create({
      application: coreSetupMock.application,
      getStartServices: coreSetupMock.getStartServices,
      authc: authcMock,
    });

    const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
    await (mount as AppMount)({
      element: containerMock,
      appBasePath: '',
      onAppLeave: jest.fn(),
      history: scopedHistoryMock.create(),
    });

    expect(coreStartMock.chrome.setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(coreStartMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Account Management' },
    ]);

    const mockRenderApp = jest.requireMock('./account_management_page').renderAccountManagementPage;
    expect(mockRenderApp).toHaveBeenCalledTimes(1);
    expect(mockRenderApp).toHaveBeenCalledWith(coreStartMock.i18n, containerMock, {
      userAPIClient: expect.any(UserAPIClient),
      authc: authcMock,
      notifications: coreStartMock.notifications,
    });
  });
});
