/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./reset_session_page');

import { AppMount } from 'src/core/public';
import { resetSessionApp } from './reset_session_app';

import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';

describe('resetSessionApp', () => {
  it('properly registers application', () => {
    const coreSetupMock = coreMock.createSetup();

    resetSessionApp.create({
      application: coreSetupMock.application,
      getStartServices: coreSetupMock.getStartServices,
    });

    expect(coreSetupMock.application.register).toHaveBeenCalledTimes(1);

    const [[appRegistration]] = coreSetupMock.application.register.mock.calls;
    expect(appRegistration).toEqual({
      id: 'security_reset_session',
      title: 'Reset Session',
      chromeless: true,
      appRoute: '/security/reset_session',
      mount: expect.any(Function),
    });
  });

  it('properly sets breadcrumbs and renders application', async () => {
    const coreSetupMock = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, {}, {}]);

    const containerMock = document.createElement('div');

    resetSessionApp.create({
      application: coreSetupMock.application,
      getStartServices: coreSetupMock.getStartServices,
    });

    const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
    await (mount as AppMount)({
      element: containerMock,
      appBasePath: '',
      onAppLeave: jest.fn(),
      history: scopedHistoryMock.create(),
    });

    const mockRenderApp = jest.requireMock('./reset_session_page').renderResetSessionPage;
    expect(mockRenderApp).toHaveBeenCalledTimes(1);
    expect(mockRenderApp).toHaveBeenCalledWith(coreStartMock.i18n, containerMock, {
      basePath: coreStartMock.http.basePath,
    });
  });
});
