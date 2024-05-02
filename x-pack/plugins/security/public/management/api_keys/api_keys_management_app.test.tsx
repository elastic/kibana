/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { noop } from 'lodash';

import { coreMock, scopedHistoryMock, themeServiceMock } from '@kbn/core/public/mocks';
import type { Unmount } from '@kbn/management-plugin/public/types';

import { apiKeysManagementApp } from './api_keys_management_app';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { securityMock } from '../../mocks';

const element = document.body.appendChild(document.createElement('div'));

describe('apiKeysManagementApp', () => {
  it('renders application and sets breadcrumbs', async () => {
    const { getStartServices } = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    getStartServices.mockResolvedValue([coreStartMock, {}, {}]);
    const { authc } = securityMock.createSetup();
    const setBreadcrumbs = jest.fn();
    const history = scopedHistoryMock.create({ pathname: '/' });
    coreStartMock.application.capabilities = {
      ...coreStartMock.application.capabilities,
      api_keys: {
        save: true,
      },
    };

    coreStartMock.http.get.mockResolvedValue({
      apiKeys: [],
      canManageCrossClusterApiKeys: true,
      canManageApiKeys: true,
      canManageOwnApiKeys: true,
    });

    authc.getCurrentUser.mockResolvedValue(
      mockAuthenticatedUser({
        username: 'elastic',
        full_name: '',
        email: '',
        enabled: true,
        roles: ['superuser'],
      })
    );

    let unmount: Unmount = noop;
    await act(async () => {
      unmount = await apiKeysManagementApp.create({ authc, getStartServices }).mount({
        basePath: '/',
        element,
        setBreadcrumbs,
        history,
        theme: coreStartMock.theme,
        theme$: themeServiceMock.createTheme$(), // needed as a deprecated field in ManagementAppMountParams
      });
    });

    expect(setBreadcrumbs).toHaveBeenLastCalledWith([{ text: 'API keys' }]);

    unmount();
  });
});
