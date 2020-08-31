/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./logged_out_page');

import { AppMount } from 'src/core/public';
import { loggedOutApp } from './logged_out_app';

import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';

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

    const containerMock = document.createElement('div');

    loggedOutApp.create(coreSetupMock);

    const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
    await (mount as AppMount)({
      element: containerMock,
      appBasePath: '',
      onAppLeave: jest.fn(),
      history: scopedHistoryMock.create(),
    });

    const mockRenderApp = jest.requireMock('./logged_out_page').renderLoggedOutPage;
    expect(mockRenderApp).toHaveBeenCalledTimes(1);
    expect(mockRenderApp).toHaveBeenCalledWith(coreStartMock.i18n, containerMock, {
      basePath: coreStartMock.http.basePath,
    });
  });
});
