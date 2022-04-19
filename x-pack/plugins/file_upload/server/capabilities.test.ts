/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupCapabilities } from './capabilities';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { Capabilities, CoreStart } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';

describe('setupCapabilities', () => {
  it('registers a capabilities provider for the file upload feature', () => {
    const coreSetup = coreMock.createSetup();
    setupCapabilities(coreSetup);

    expect(coreSetup.capabilities.registerProvider).toHaveBeenCalledTimes(1);
    const [provider] = coreSetup.capabilities.registerProvider.mock.calls[0];
    expect(provider()).toMatchInlineSnapshot(`
      Object {
        "fileUpload": Object {
          "show": true,
        },
      }
    `);
  });

  it('registers a capabilities switcher that returns unaltered capabilities when security is disabled', async () => {
    const coreSetup = coreMock.createSetup();
    setupCapabilities(coreSetup);

    expect(coreSetup.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
    const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];

    const capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      fileUpload: {
        show: true,
      },
    } as Capabilities;

    const request = httpServerMock.createKibanaRequest();

    await expect(switcher(request, capabilities, false)).resolves.toMatchInlineSnapshot(`
            Object {
              "catalogue": Object {},
              "fileUpload": Object {
                "show": true,
              },
              "management": Object {},
              "navLinks": Object {},
            }
          `);
  });

  it('registers a capabilities switcher that returns unaltered capabilities when default capabilities are requested', async () => {
    const coreSetup = coreMock.createSetup();
    const security = securityMock.createStart();
    security.authz.mode.useRbacForRequest.mockReturnValue(true);
    coreSetup.getStartServices.mockResolvedValue([
      undefined as unknown as CoreStart,
      { security },
      undefined,
    ]);
    setupCapabilities(coreSetup);

    expect(coreSetup.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
    const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];

    const capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      fileUpload: {
        show: true,
      },
    } as Capabilities;

    const request = httpServerMock.createKibanaRequest();

    await expect(switcher(request, capabilities, true)).resolves.toMatchInlineSnapshot(`
            Object {
              "catalogue": Object {},
              "fileUpload": Object {
                "show": true,
              },
              "management": Object {},
              "navLinks": Object {},
            }
          `);

    expect(security.authz.mode.useRbacForRequest).not.toHaveBeenCalled();
    expect(security.authz.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
  });

  it('registers a capabilities switcher that disables capabilities for underprivileged users', async () => {
    const coreSetup = coreMock.createSetup();
    const security = securityMock.createStart();
    security.authz.mode.useRbacForRequest.mockReturnValue(true);

    const mockCheckPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: false });
    security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(mockCheckPrivileges);
    coreSetup.getStartServices.mockResolvedValue([
      undefined as unknown as CoreStart,
      { security },
      undefined,
    ]);
    setupCapabilities(coreSetup);

    expect(coreSetup.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
    const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];

    const capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      fileUpload: {
        show: true,
      },
    } as Capabilities;

    const request = httpServerMock.createKibanaRequest();

    await expect(switcher(request, capabilities, false)).resolves.toMatchInlineSnapshot(`
            Object {
              "fileUpload": Object {
                "show": false,
              },
            }
          `);

    expect(security.authz.mode.useRbacForRequest).toHaveBeenCalledTimes(1);
    expect(security.authz.mode.useRbacForRequest).toHaveBeenCalledWith(request);
    expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledTimes(1);
    expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(request);
  });

  it('registers a capabilities switcher that enables capabilities for privileged users', async () => {
    const coreSetup = coreMock.createSetup();
    const security = securityMock.createStart();
    security.authz.mode.useRbacForRequest.mockReturnValue(true);

    const mockCheckPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
    security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(mockCheckPrivileges);
    coreSetup.getStartServices.mockResolvedValue([
      undefined as unknown as CoreStart,
      { security },
      undefined,
    ]);
    setupCapabilities(coreSetup);

    expect(coreSetup.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
    const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];

    const capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      fileUpload: {
        show: true,
      },
    } as Capabilities;

    const request = httpServerMock.createKibanaRequest();

    await expect(switcher(request, capabilities, false)).resolves.toMatchInlineSnapshot(`
            Object {
              "catalogue": Object {},
              "fileUpload": Object {
                "show": true,
              },
              "management": Object {},
              "navLinks": Object {},
            }
          `);

    expect(security.authz.mode.useRbacForRequest).toHaveBeenCalledTimes(1);
    expect(security.authz.mode.useRbacForRequest).toHaveBeenCalledWith(request);
    expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledTimes(1);
    expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(request);
  });

  it('registers a capabilities switcher that disables capabilities for unauthenticated requests', async () => {
    const coreSetup = coreMock.createSetup();
    const security = securityMock.createStart();
    security.authz.mode.useRbacForRequest.mockReturnValue(true);
    const mockCheckPrivileges = jest
      .fn()
      .mockRejectedValue(new Error('this should not have been called'));
    security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(mockCheckPrivileges);
    coreSetup.getStartServices.mockResolvedValue([
      undefined as unknown as CoreStart,
      { security },
      undefined,
    ]);
    setupCapabilities(coreSetup);

    expect(coreSetup.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
    const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];

    const capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      fileUpload: {
        show: true,
      },
    } as Capabilities;

    const request = httpServerMock.createKibanaRequest({ auth: { isAuthenticated: false } });

    await expect(switcher(request, capabilities, false)).resolves.toMatchInlineSnapshot(`
            Object {
              "fileUpload": Object {
                "show": false,
              },
            }
          `);

    expect(security.authz.mode.useRbacForRequest).toHaveBeenCalledTimes(1);
    expect(security.authz.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
  });

  it('registers a capabilities switcher that skips privilege check for requests not using rbac', async () => {
    const coreSetup = coreMock.createSetup();
    const security = securityMock.createStart();
    security.authz.mode.useRbacForRequest.mockReturnValue(false);
    coreSetup.getStartServices.mockResolvedValue([
      undefined as unknown as CoreStart,
      { security },
      undefined,
    ]);
    setupCapabilities(coreSetup);

    expect(coreSetup.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
    const [switcher] = coreSetup.capabilities.registerSwitcher.mock.calls[0];

    const capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      fileUpload: {
        show: true,
      },
    } as Capabilities;

    const request = httpServerMock.createKibanaRequest();

    await expect(switcher(request, capabilities, false)).resolves.toMatchInlineSnapshot(`
            Object {
              "catalogue": Object {},
              "fileUpload": Object {
                "show": true,
              },
              "management": Object {},
              "navLinks": Object {},
            }
          `);

    expect(security.authz.mode.useRbacForRequest).toHaveBeenCalledTimes(1);
    expect(security.authz.mode.useRbacForRequest).toHaveBeenCalledWith(request);
    expect(security.authz.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
  });
});
