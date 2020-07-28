/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./login_page');

import { AppMount } from 'src/core/public';
import { loginApp } from './login_app';

import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';

describe('loginApp', () => {
  it('properly registers application', () => {
    const coreSetupMock = coreMock.createSetup();

    loginApp.create({
      ...coreSetupMock,
      config: { loginAssistanceMessage: '' },
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
    const containerMock = document.createElement('div');

    loginApp.create({
      ...coreSetupMock,
      config: { loginAssistanceMessage: 'some-message' },
    });

    const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
    await (mount as AppMount)({
      element: containerMock,
      appBasePath: '',
      onAppLeave: jest.fn(),
      history: scopedHistoryMock.create(),
    });

    const mockRenderApp = jest.requireMock('./login_page').renderLoginPage;
    expect(mockRenderApp).toHaveBeenCalledTimes(1);
    expect(mockRenderApp).toHaveBeenCalledWith(coreStartMock.i18n, containerMock, {
      http: coreStartMock.http,
      notifications: coreStartMock.notifications,
      fatalErrors: coreStartMock.fatalErrors,
      loginAssistanceMessage: 'some-message',
    });
  });
});
