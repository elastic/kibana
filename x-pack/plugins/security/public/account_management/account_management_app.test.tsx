/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { noop } from 'lodash';

import type { AppUnmount } from 'src/core/public';
import { AppNavLinkStatus } from 'src/core/public';
import { coreMock, scopedHistoryMock, themeServiceMock } from 'src/core/public/mocks';

import { securityMock } from '../mocks';
import { accountManagementApp } from './account_management_app';
import * as AccountManagementPageImports from './account_management_page';

const AccountManagementPageMock = jest
  .spyOn(AccountManagementPageImports, 'AccountManagementPage')
  .mockReturnValue(null);

describe('accountManagementApp', () => {
  it('should register application', () => {
    const { authc } = securityMock.createSetup();
    const { application, getStartServices } = coreMock.createSetup();

    accountManagementApp.create({
      application,
      getStartServices,
      authc,
    });

    expect(application.register).toHaveBeenCalledTimes(1);
    expect(application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'security_account',
        appRoute: '/security/account',
        navLinkStatus: AppNavLinkStatus.hidden,
        mount: expect.any(Function),
      })
    );
  });

  it('should render AccountManagementPage on mount', async () => {
    const { authc } = securityMock.createSetup();
    const { application, getStartServices } = coreMock.createSetup();
    getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);

    accountManagementApp.create({
      application,
      authc,
      getStartServices,
    });

    const [[{ mount }]] = application.register.mock.calls;

    let unmount: AppUnmount = noop;
    await act(async () => {
      unmount = await mount({
        element: document.createElement('div'),
        appBasePath: '',
        onAppLeave: jest.fn(),
        setHeaderActionMenu: jest.fn(),
        history: scopedHistoryMock.create(),
        theme$: themeServiceMock.createTheme$(),
      });
    });

    expect(AccountManagementPageMock).toHaveBeenCalledTimes(1);

    unmount();
  });
});
