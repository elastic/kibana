/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./access_agreement_page');

import { AppMount } from 'src/core/public';
import { accessAgreementApp } from './access_agreement_app';

import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';

describe('accessAgreementApp', () => {
  it('properly registers application', () => {
    const coreSetupMock = coreMock.createSetup();

    accessAgreementApp.create({
      application: coreSetupMock.application,
      getStartServices: coreSetupMock.getStartServices,
    });

    expect(coreSetupMock.application.register).toHaveBeenCalledTimes(1);

    const [[appRegistration]] = coreSetupMock.application.register.mock.calls;
    expect(appRegistration).toEqual({
      id: 'security_access_agreement',
      chromeless: true,
      appRoute: '/security/access_agreement',
      title: 'Access Agreement',
      mount: expect.any(Function),
    });
  });

  it('properly renders application', async () => {
    const coreSetupMock = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, {}, {}]);
    const containerMock = document.createElement('div');

    accessAgreementApp.create({
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

    const mockRenderApp = jest.requireMock('./access_agreement_page').renderAccessAgreementPage;
    expect(mockRenderApp).toHaveBeenCalledTimes(1);
    expect(mockRenderApp).toHaveBeenCalledWith(coreStartMock.i18n, containerMock, {
      http: coreStartMock.http,
      notifications: coreStartMock.notifications,
      fatalErrors: coreStartMock.fatalErrors,
    });
  });
});
