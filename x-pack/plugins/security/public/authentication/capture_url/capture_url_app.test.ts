/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMount, ScopedHistory } from 'src/core/public';
import { captureURLApp } from './capture_url_app';

import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';

describe('captureURLApp', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://some-host' },
      writable: true,
    });
  });

  it('properly registers application', () => {
    const coreSetupMock = coreMock.createSetup();

    captureURLApp.create(coreSetupMock);

    expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledTimes(1);
    expect(coreSetupMock.http.anonymousPaths.register).toHaveBeenCalledWith(
      '/internal/security/capture-url'
    );

    expect(coreSetupMock.application.register).toHaveBeenCalledTimes(1);

    const [[appRegistration]] = coreSetupMock.application.register.mock.calls;
    expect(appRegistration).toEqual({
      id: 'security_capture_url',
      chromeless: true,
      appRoute: '/internal/security/capture-url',
      title: 'Capture URL',
      mount: expect.any(Function),
    });
  });

  it('properly handles captured URL', async () => {
    window.location.href = `https://host.com/mock-base-path/internal/security/capture-url?next=${encodeURIComponent(
      '/mock-base-path/app/home'
    )}&providerType=saml&providerName=saml1#/?_g=()`;

    const coreSetupMock = coreMock.createSetup();
    coreSetupMock.http.post.mockResolvedValue({ location: '/mock-base-path/app/home#/?_g=()' });

    captureURLApp.create(coreSetupMock);

    const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
    await (mount as AppMount)({
      element: document.createElement('div'),
      appBasePath: '',
      onAppLeave: jest.fn(),
      history: (scopedHistoryMock.create() as unknown) as ScopedHistory,
    });

    expect(coreSetupMock.http.post).toHaveBeenCalledTimes(1);
    expect(coreSetupMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
      body: JSON.stringify({
        providerType: 'saml',
        providerName: 'saml1',
        currentURL: `https://host.com/mock-base-path/internal/security/capture-url?next=${encodeURIComponent(
          '/mock-base-path/app/home'
        )}&providerType=saml&providerName=saml1#/?_g=()`,
      }),
    });

    expect(window.location.href).toBe('/mock-base-path/app/home#/?_g=()');
  });
});
