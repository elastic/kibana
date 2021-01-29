/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';
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

    const unmount = await usersManagementApp.create({ authc, getStartServices }).mount({
      basePath: '/',
      element,
      setBreadcrumbs,
      history,
    });

    expect(setBreadcrumbs).toHaveBeenLastCalledWith([
      { href: '/', text: 'Users' },
      { href: '/create', text: 'Create' },
    ]);

    unmount();
  });
});
