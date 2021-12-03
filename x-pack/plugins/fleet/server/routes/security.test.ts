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
import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from '../services';
import type { FleetRequestHandlerContext } from '../types';

import { makeRouterWithFleetAuthz } from './security';

function getCheckPrivilegesResponse(privileges: {
  fleet?: {
    all?: boolean;
    setup?: boolean;
  };
  integrations?: {
    all?: boolean;
    read?: boolean;
  };
}): any {
  return {
    privileges: {
      hasAllRequested:
        !!privileges.fleet?.all &&
        !!privileges.fleet?.setup &&
        !!privileges.integrations?.all &&
        !!privileges.integrations?.read,
      kibana: [
        { authorized: privileges.fleet?.all ?? false },
        { authorized: privileges.fleet?.setup ?? false },
        { authorized: privileges.integrations?.all ?? false },
        { authorized: privileges.integrations?.read ?? false },
      ],
    },
  };
}

describe('RouterWrappers', () => {
  const runTest = async ({
    security: {
      roles = [],
      pluginEnabled = true,
      licenseEnabled = true,
      checkPrivilegesDynamically,
    } = {},
    routeConfig = {
      path: '/api/fleet/test',
    },
  }: {
    security?: {
      roles?: string[];
      pluginEnabled?: boolean;
      licenseEnabled?: boolean;
      checkPrivilegesDynamically?: CheckPrivilegesDynamically;
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

    const { router: wrappedRouter, onPostAuthHandler } = makeRouterWithFleetAuthz(fakeRouter);
    wrappedRouter.get({ ...routeConfig } as RouteConfig<any, any, any, any>, fakeHandler);
    const wrappedHandler = fakeRouter.get.mock.calls[0][1];
    const wrappedRouteConfig = fakeRouter.get.mock.calls[0][0];
    const resFactory = { forbidden: jest.fn(() => 'forbidden'), ok: jest.fn(() => 'ok') };
    const fakeToolkit = { next: jest.fn(() => 'next') };

    const fakeReq = {
      route: {
        path: routeConfig.path,
        method: 'get',
        options: wrappedRouteConfig.options,
      },
    } as any;
    const onPostRes = await onPostAuthHandler(fakeReq, resFactory as any, fakeToolkit as any);

    if ((onPostRes as unknown) !== 'next') {
      return onPostRes;
    }

    const res = await wrappedHandler(
      {
        core: coreMock.createRequestHandlerContext(),
      } as unknown as FleetRequestHandlerContext,
      fakeReq,
      resFactory as any
    );

    return res as unknown as 'forbidden' | 'ok';
  };

  describe('requireSuperUser: true', () => {
    it('allow users with the superuser role', async () => {
      expect(
        await runTest({
          security: { roles: ['superuser'] },
          routeConfig: {
            path: '/api/fleet/test',
            fleetRequireSuperuser: true,
          },
        })
      ).toEqual('ok');
    });

    it('does not allow users without the superuser role', async () => {
      expect(
        await runTest({
          security: { roles: ['foo'] },
          routeConfig: {
            path: '/api/fleet/test',
            fleetRequireSuperuser: true,
          },
        })
      ).toEqual('forbidden');
    });

    it('does not allow security plugin to be disabled', async () => {
      expect(
        await runTest({
          security: { pluginEnabled: false },
          routeConfig: {
            path: '/api/fleet/test',
            fleetRequireSuperuser: true,
          },
        })
      ).toEqual('forbidden');
    });

    it('does not allow security license to be disabled', async () => {
      expect(
        await runTest({
          security: { licenseEnabled: false },
          routeConfig: {
            path: '/api/fleet/test',
            fleetRequireSuperuser: true,
          },
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
          security: { pluginEnabled: false },
          routeConfig: {
            fleetAuthz: { fleet: { all: true } },
          },
        })
      ).toEqual('forbidden');
    });

    it('does not allow security license to be disabled', async () => {
      expect(
        await runTest({
          security: { licenseEnabled: false },
          routeConfig: {
            fleetAuthz: { fleet: { all: true } },
          },
        })
      ).toEqual('forbidden');
    });

    describe('with fleetAllowFleetSetupPrivilege:true', () => {
      const routeConfig = {
        path: '/api/fleet/test',
        fleetAllowFleetSetupPrivilege: true,
        fleetAuthz: { fleet: { all: true } },
      };
      it('allow users with required privileges', async () => {
        mockCheckPrivileges.mockResolvedValueOnce(
          getCheckPrivilegesResponse({
            fleet: { all: true },
          })
        );
        expect(
          await runTest({
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('ok');
      });

      it('allow users with setup privilege', async () => {
        mockCheckPrivileges.mockResolvedValueOnce(
          getCheckPrivilegesResponse({
            fleet: { setup: true },
          })
        );
        expect(
          await runTest({
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('ok');
      });

      it('does not allow users without any privileges', async () => {
        mockCheckPrivileges.mockResolvedValueOnce(getCheckPrivilegesResponse({}));
        expect(
          await runTest({
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('forbidden');
      });
    });

    describe('with fleetAllowFleetSetupPrivilege:false', () => {
      const routeConfig = {
        path: '/api/fleet/test',
        fleetAllowFleetSetupPrivilege: false,
        fleetAuthz: { fleet: { all: true } },
      };
      it('allow users with required privileges', async () => {
        mockCheckPrivileges.mockResolvedValueOnce(
          getCheckPrivilegesResponse({
            fleet: { all: true },
          })
        );
        expect(
          await runTest({
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('forbidden');
      });

      it('does not allow users with setup privileges', async () => {
        mockCheckPrivileges.mockResolvedValueOnce(
          getCheckPrivilegesResponse({
            fleet: { setup: true },
          })
        );
        expect(
          await runTest({
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('forbidden');
      });

      it('does not allow users without required privileges', async () => {
        mockCheckPrivileges.mockResolvedValueOnce(
          getCheckPrivilegesResponse({
            fleet: { setup: false },
          })
        );
        expect(
          await runTest({
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('forbidden');
      });
    });

    describe('with fleetAuthz', () => {
      const routeConfig = {
        path: '/api/fleet/test',
        fleetAuthz: { fleet: { all: true }, integrations: { installPackages: true } },
      };
      it('allow users with all required fleet authz role', async () => {
        mockCheckPrivileges.mockResolvedValueOnce(
          getCheckPrivilegesResponse({
            fleet: { all: true },
            integrations: { all: true },
          })
        );
        expect(
          await runTest({
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('ok');
      });

      it('does not allow users with partial fleet authz roles', async () => {
        mockCheckPrivileges.mockResolvedValueOnce(
          getCheckPrivilegesResponse({
            fleet: { all: true },
          })
        );
        expect(
          await runTest({
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('forbidden');
      });

      it('does not allow users with no fleet authz roles', async () => {
        mockCheckPrivileges.mockResolvedValueOnce(getCheckPrivilegesResponse({}));
        expect(
          await runTest({
            security: { checkPrivilegesDynamically: mockCheckPrivileges },
            routeConfig,
          })
        ).toEqual('forbidden');
      });
    });
  });
});
