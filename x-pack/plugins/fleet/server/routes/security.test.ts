/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler, RouteConfig } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import type { AuthenticatedUser, CheckPrivilegesPayload } from '@kbn/security-plugin/server';
import type { CheckPrivilegesResponse } from '@kbn/security-plugin/server/authorization/types';
import type { CheckPrivilegesDynamically } from '@kbn/security-plugin/server/authorization/check_privileges_dynamically';

import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from '../services';
import type { FleetRequestHandlerContext } from '../types';

import { makeRouterWithFleetAuthz } from './security';

function getCheckPrivilegesMockedImplementation(kibanaRoles: string[]) {
  return (checkPrivileges: CheckPrivilegesPayload) => {
    const kibana = ((checkPrivileges?.kibana ?? []) as string[]).map((role: string) => {
      return {
        privilege: role,
        authorized: kibanaRoles.includes(role),
      };
    });

    return Promise.resolve({
      hasAllRequested: kibana.every((r: any) => r.authorized),
      privileges: {
        kibana,
      },
    } as unknown as CheckPrivilegesResponse);
  };
}

describe('FleetAuthzRouter', () => {
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
    security: {
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
    mockContext.securityStart.authz.actions.api.get.mockImplementation((priv) => `api:${priv}`);

    mockContext.securityStart.authc.getCurrentUser.mockReturnValue({
      username: 'foo',
      roles,
    } as unknown as AuthenticatedUser);

    mockContext.securitySetup.license.isEnabled.mockReturnValue(licenseEnabled);
    if (licenseEnabled) {
      mockContext.securityStart.authz.mode.useRbacForRequest.mockReturnValue(true);
    }

    if (checkPrivilegesDynamically) {
      mockContext.securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        checkPrivilegesDynamically
      );
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

  const mockCheckPrivileges: jest.Mock<
    ReturnType<CheckPrivilegesDynamically>,
    Parameters<CheckPrivilegesDynamically>
  > = jest.fn().mockResolvedValue({ hasAllRequested: true });

  it('does not allow security plugin to be disabled', async () => {
    expect(
      await runTest({
        security: { pluginEnabled: false, licenseEnabled: false },
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

  describe('with fleet setup privileges', () => {
    const routeConfig = {
      path: '/api/fleet/test',
      fleetAuthz: { fleet: { setup: true } },
    };

    it('allow users with fleet-setup role', async () => {
      mockCheckPrivileges.mockImplementation(
        getCheckPrivilegesMockedImplementation(['api:fleet-setup'])
      );
      expect(
        await runTest({
          security: { checkPrivilegesDynamically: mockCheckPrivileges },
          routeConfig,
        })
      ).toEqual('ok');
    });

    it('do not allow users without fleet-setup role', async () => {
      mockCheckPrivileges.mockImplementation(getCheckPrivilegesMockedImplementation([]));
      expect(
        await runTest({
          security: { checkPrivilegesDynamically: mockCheckPrivileges },
          routeConfig,
        })
      ).toEqual('forbidden');
    });
  });

  describe('with fleet role', () => {
    const routeConfig = {
      path: '/api/fleet/test',
      fleetAuthz: { integrations: { readPackageInfo: true } },
    };

    it('allow users with all required fleet authz role', async () => {
      mockCheckPrivileges.mockImplementation(
        getCheckPrivilegesMockedImplementation(['api:integrations-read'])
      );
      expect(
        await runTest({
          security: { checkPrivilegesDynamically: mockCheckPrivileges },
          routeConfig,
        })
      ).toEqual('ok');
    });

    it('does not allow users without the required fleet role', async () => {
      mockCheckPrivileges.mockImplementation(getCheckPrivilegesMockedImplementation([]));
      expect(
        await runTest({
          security: { checkPrivilegesDynamically: mockCheckPrivileges },
          routeConfig,
        })
      ).toEqual('forbidden');
    });
  });
});
