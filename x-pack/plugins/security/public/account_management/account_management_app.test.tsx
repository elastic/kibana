/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import { act, screen, fireEvent } from '@testing-library/react';
import { AppMount, AppNavLinkStatus, ScopedHistory } from '../../../../../src/core/public';
import { coreMock } from '../../../../../src/core/public/mocks';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { securityMock } from '../mocks';
import { accountManagementApp } from './account_management_app';
import { createMemoryHistory } from 'history';

describe('accountManagementApp', () => {
  it('registers application', () => {
    const { application, getStartServices } = coreMock.createSetup();
    const { authc } = securityMock.createSetup();
    accountManagementApp.create({ application, getStartServices, authc });
    expect(application.register).toHaveBeenLastCalledWith({
      id: 'security_account',
      appRoute: '/security/account',
      navLinkStatus: AppNavLinkStatus.hidden,
      title: 'Account Management',
      mount: expect.any(Function),
    });
  });

  it('renders application and sets breadcrumbs', async () => {
    const { application, getStartServices } = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    getStartServices.mockResolvedValue([coreStartMock, {}, {}]);
    const { authc } = securityMock.createSetup();
    authc.getCurrentUser.mockResolvedValue(
      mockAuthenticatedUser({ username: 'some-user', full_name: undefined })
    );
    accountManagementApp.create({ application, getStartServices, authc });
    const [[{ mount }]] = application.register.mock.calls;
    const element = document.body.appendChild(document.createElement('div'));

    await act(async () => {
      await (mount as AppMount)({
        element,
        appBasePath: '',
        onAppLeave: jest.fn(),
        setHeaderActionMenu: jest.fn(),
        history: (createMemoryHistory() as unknown) as ScopedHistory,
      });
    });
    expect(coreStartMock.chrome.setBreadcrumbs).toHaveBeenLastCalledWith([
      expect.objectContaining({ text: 'Account Management' }),
    ]);

    fireEvent.click(screen.getByRole('tab', { name: 'API Keys' }));
    expect(coreStartMock.chrome.setBreadcrumbs).toHaveBeenLastCalledWith([
      expect.objectContaining({ text: 'Account Management' }),
      expect.objectContaining({ text: 'API Keys' }),
    ]);

    // Need to cleanup manually since `mount` renders the app straight to the DOM
    ReactDOM.unmountComponentAtNode(element);
    document.body.removeChild(element);
  });
});
