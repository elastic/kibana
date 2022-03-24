/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/public/mocks';

import { captureURLApp } from './capture_url_app';

describe('captureURLApp', () => {
  let mockLocationReplace: jest.Mock;
  beforeAll(() => {
    mockLocationReplace = jest.fn();
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://some-host',
        hash: '#/?_g=()',
        origin: 'https://some-host',
        replace: mockLocationReplace,
      },
      writable: true,
    });
  });

  beforeEach(() => {
    mockLocationReplace.mockClear();
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
      '/mock-base-path/app/home?auth_provider_hint=saml1'
    )}#/?_g=()`;

    const coreSetupMock = coreMock.createSetup();
    captureURLApp.create(coreSetupMock);

    const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
    await mount(coreMock.createAppMountParameters());

    expect(mockLocationReplace).toHaveBeenCalledTimes(1);
    expect(mockLocationReplace).toHaveBeenCalledWith(
      'https://some-host/mock-base-path/app/home?auth_provider_hint=saml1&auth_url_hash=%23%2F%3F_g%3D%28%29#/?_g=()'
    );
    expect(coreSetupMock.fatalErrors.add).not.toHaveBeenCalled();
  });

  it('properly handles open redirects', async () => {
    window.location.href = `https://host.com/mock-base-path/internal/security/capture-url?next=${encodeURIComponent(
      'https://evil.com/mock-base-path/app/home?auth_provider_hint=saml1'
    )}#/?_g=()`;

    const coreSetupMock = coreMock.createSetup();
    captureURLApp.create(coreSetupMock);

    const [[{ mount }]] = coreSetupMock.application.register.mock.calls;
    await mount(coreMock.createAppMountParameters());

    expect(mockLocationReplace).toHaveBeenCalledTimes(1);
    expect(mockLocationReplace).toHaveBeenCalledWith(
      'https://some-host/?auth_url_hash=%23%2F%3F_g%3D%28%29'
    );
    expect(coreSetupMock.fatalErrors.add).not.toHaveBeenCalled();
  });
});
