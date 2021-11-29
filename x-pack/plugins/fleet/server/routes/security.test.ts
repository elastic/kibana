/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler, RouteConfig } from '../../../../../src/core/server';
import { coreMock } from '../../../../../src/core/server/mocks';
import type { AuthenticatedUser } from '../../../security/server';
import type { CheckPrivilegesDynamically } from '../../../security/server/authorization/check_privileges_dynamically';
import type { FleetAuthz } from '../../common';
import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from '../services';
import type { FleetRequestHandlerContext } from '../types';

import type { RouterWrapper } from './security';
import { RouterWrappers } from './security';

describe('RouterWrappers', () => {
  const runTest = async ({
    wrapper,
    security: {
      roles = [],
      pluginEnabled = true,
      licenseEnabled = true,
      checkPrivilegesDynamically,
    } = {},
    routeConfig = {},
    context,
  }: {
    wrapper: RouterWrapper;
    security?: {
      roles?: string[];
      pluginEnabled?: boolean;
      licenseEnabled?: boolean;
      checkPrivilegesDynamically?: CheckPrivilegesDynamically;
    };
    context?: {
      fleet?: {
        authz: FleetAuthz;
      };
    };
    routeConfig?: any;
  }) => {
    const fakeRouter = {
      get: jest.fn(),
    } as unknown as jest.Mocked<IRouter<FleetRequestHandlerContext>>;
    const fakeHandler: RequestHandler = jest.fn((ctx, req, res) => res.ok());

    const mockContext = createAppContextStartContractMock();
    // @ts-expect-error type doesn't properly respect deeply mocked keys
    mockContext.securityStart?.authz.actions.api.get.mockImplementation((priv) => `api:${priv}`);

    if (!pluginEnabled) {
      mockContext.securitySetup = undefined;
      mockContext.securityStart = undefined;
    } else {
      mockContext.securityStart?.authc.getCurrentUser.mockReturnValue({
        username: 'foo',
        roles,
      } as unknown as AuthenticatedUser);

      mockContext.securitySetup?.license.isEnabled.mockReturnValue(licenseEnabled);
      if (licenseEnabled) {
        mockContext.securityStart?.authz.mode.useRbacForRequest.mockReturnValue(true);
      }

      if (checkPrivilegesDynamically) {
        mockContext.securityStart?.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
          checkPrivilegesDynamically
        );
      }
    }

    appContextService.start(mockContext);

    const wrappedRouter = wrapper(fakeRouter);
    wrappedRouter.get({ ...routeConfig } as RouteConfig<any, any, any, any>, fakeHandler);
    const wrappedHandler = fakeRouter.get.mock.calls[0][1];
    const resFactory = { forbidden: jest.fn(() => 'forbidden'), ok: jest.fn(() => 'ok') };
    const res = await wrappedHandler(
      {
        core: coreMock.createRequestHandlerContext(),
        ...context,
      } as unknown as FleetRequestHandlerContext,
      {} as any,
      resFactory as any
    );

    return res as unknown as 'forbidden' | 'ok';
  };

  describe('require.superuser', () => {
    it('allow users with the superuser role', async () => {
      expect(
        await runTest({
          wrapper: RouterWrappers.require.superuser,
          security: { roles: ['superuser'] },
        })
      ).toEqual('ok');
    });

    it('does not allow users without the superuser role', async () => {
      expect(
        await runTest({
          wrapper: RouterWrappers.require.superuser,
          security: { roles: ['foo'] },
        })
      ).toEqual('forbidden');
    });

    it('does not allow security plugin to be disabled', async () => {
      expect(
        await runTest({
          wrapper: RouterWrappers.require.superuser,
          security: { pluginEnabled: false },
        })
      ).toEqual('forbidden');
    });

    it('does not allow security license to be disabled', async () => {
      expect(
        await runTest({
          wrapper: RouterWrappers.require.superuser,
          security: { licenseEnabled: false },
        })
      ).toEqual('forbidden');
    });
  });

  describe('require.fleetAuthzRouter', () => {
    const mockCheckPrivileges: jest.Mock<
      ReturnType<CheckPrivilegesDynamically>,
      Parameters<CheckPrivilegesDynamically>
    > = jest.fn().mockResolvedValue({ hasAllRequested: true });

    it('does not allow security plugin to be disabled', async () => {
      expect(
        await runTest({
          wrapper: RouterWrappers.require.fleetAuthz,
          security: { pluginEnabled: false },
        })
      ).toEqual('forbidden');
    });

    it('does not allow security license to be disabled', async () => {
      expect(
        await runTest({
          wrapper: RouterWrappers.require.fleetAuthz,
          security: { licenseEnabled: false },
        })
      ).toEqual('forbidden');
    });

    describe('with fleetAllowFleetSetupPrivilege:true', () => {
      const routeConfig = { fleetAllowFleetSetupPrivilege: true, fleetAuthz: { fleet: ['all'] } };
      it('allow users with required privileges', async () => {
        expect(
          await runTest({
            wrapper: RouterWrappers.require.fleetAuthz,
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('ok');
      });

      it('does not allow users without required privileges', async () => {
        mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false } as any);
        expect(
          await runTest({
            wrapper: RouterWrappers.require.fleetAuthz,
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('forbidden');
      });
    });

    describe('with fleetAllowFleetSetupPrivilege:false', () => {
      const routeConfig = { fleetAllowFleetSetupPrivilege: false, fleetAuthz: { fleet: ['all'] } };
      it('allow users with required privileges', async () => {
        expect(
          await runTest({
            wrapper: RouterWrappers.require.fleetAuthz,
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('forbidden');
      });

      it('does not allow users without required privileges', async () => {
        mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false } as any);
        expect(
          await runTest({
            wrapper: RouterWrappers.require.fleetAuthz,
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('forbidden');
      });
    });

    describe('with fleetAuth', () => {
      const routeConfig = { fleetAuthz: { fleet: ['all'], integrations: ['installPackages'] } };
      it('allow users with all required fleet authz role', async () => {
        expect(
          await runTest({
            wrapper: RouterWrappers.require.fleetAuthz,
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
            context: {
              fleet: {
                authz: {
                  fleet: {
                    all: true,
                  },
                  integrations: {
                    installPackages: true,
                  },
                } as FleetAuthz,
              },
            },
          })
        ).toEqual('ok');
      });

      it('does not allow users with partial fleet authz roles', async () => {
        mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false } as any);
        expect(
          await runTest({
            wrapper: RouterWrappers.require.fleetAuthz,
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
            context: {
              fleet: {
                authz: {
                  fleet: {
                    all: true,
                  },
                  integrations: {
                    installPackages: false,
                  },
                } as FleetAuthz,
              },
            },
          })
        ).toEqual('forbidden');
      });

      it('does not allow users with no fleet authz roles', async () => {
        mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false } as any);
        expect(
          await runTest({
            wrapper: RouterWrappers.require.fleetAuthz,
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
            context: {
              fleet: {
                authz: {
                  fleet: {
                    all: false,
                  },
                  integrations: {
                    installPackages: false,
                  },
                } as FleetAuthz,
              },
            },
          })
        ).toEqual('forbidden');
      });
    });
  });
});
