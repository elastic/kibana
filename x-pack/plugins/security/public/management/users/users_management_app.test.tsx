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

import { securityMock } from '../../mocks';
import { usersManagementApp } from './users_management_app';

const element = document.body.appendChild(document.createElement('div'));

describe('usersManagementApp', () => {
  it('renders application and sets breadcrumbs', async () => {
    const { getStartServices } = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    getStartServices.mockResolvedValue([coreStartMock, {}, {}]);
    const { authc } = securityMock.createSetup();

    const setBreadcrumbs = jest.fn();
    const history = scopedHistoryMock.create({ pathname: '/create' });

    let unmount: Unmount = noop;
    await act(async () => {
      unmount = await usersManagementApp.create({ authc, getStartServices }).mount({
        basePath: '/',
        element,
        setBreadcrumbs,
        history,
        theme$: themeServiceMock.createTheme$(),
      });
    });

    expect(setBreadcrumbs).toHaveBeenLastCalledWith([
      { href: '/', text: 'Users' },
      { text: 'Create' },
    ]);

    unmount();
  });
});
