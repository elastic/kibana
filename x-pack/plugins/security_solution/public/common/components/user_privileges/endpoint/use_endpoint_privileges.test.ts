/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, RenderHookResult, RenderResult } from '@testing-library/react-hooks';
import { useHttp, useCurrentUser } from '../../../lib/kibana';
import { EndpointPrivileges, useEndpointPrivileges } from './use_endpoint_privileges';
import { securityMock } from '../../../../../../security/public/mocks';
import { appRoutesService } from '../../../../../../fleet/common';
import { AuthenticatedUser } from '../../../../../../security/common';
import { licenseService } from '../../../hooks/use_license';
import { fleetGetCheckPermissionsHttpMock } from '../../../../management/pages/mocks';
import { getEndpointPrivilegesInitialStateMock } from './mocks';

jest.mock('../../../lib/kibana');
jest.mock('../../../hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

describe('When using useEndpointPrivileges hook', () => {
  let authenticatedUser: AuthenticatedUser;
  let fleetApiMock: ReturnType<typeof fleetGetCheckPermissionsHttpMock>;
  let result: RenderResult<EndpointPrivileges>;
  let unmount: ReturnType<typeof renderHook>['unmount'];
  let waitForNextUpdate: ReturnType<typeof renderHook>['waitForNextUpdate'];
  let render: () => RenderHookResult<void, EndpointPrivileges>;

  beforeEach(() => {
    authenticatedUser = securityMock.createMockAuthenticatedUser({
      roles: ['superuser'],
    });

    (useCurrentUser as jest.Mock).mockReturnValue(authenticatedUser);

    fleetApiMock = fleetGetCheckPermissionsHttpMock(
      useHttp() as Parameters<typeof fleetGetCheckPermissionsHttpMock>[0]
    );
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    render = () => {
      const hookRenderResponse = renderHook(() => useEndpointPrivileges());
      ({ result, unmount, waitForNextUpdate } = hookRenderResponse);
      return hookRenderResponse;
    };
  });

  afterEach(() => {
    unmount();
  });

  it('should return `loading: true` while retrieving privileges', async () => {
    // Add a daly to the API response that we can control from the test
    let releaseApiResponse: () => void;
    fleetApiMock.responseProvider.checkPermissions.mockDelay.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseApiResponse = () => resolve();
      })
    );
    (useCurrentUser as jest.Mock).mockReturnValue(null);

    const { rerender } = render();
    expect(result.current).toEqual(
      getEndpointPrivilegesInitialStateMock({
        canAccessEndpointManagement: false,
        canAccessFleet: false,
        loading: true,
      })
    );

    // Make user service available
    (useCurrentUser as jest.Mock).mockReturnValue(authenticatedUser);
    rerender();
    expect(result.current).toEqual(
      getEndpointPrivilegesInitialStateMock({
        canAccessEndpointManagement: false,
        canAccessFleet: false,
        loading: true,
      })
    );

    // Release the API response
    await act(async () => {
      fleetApiMock.waitForApi();
      releaseApiResponse!();
    });
    expect(result.current).toEqual(getEndpointPrivilegesInitialStateMock());
  });

  it('should call Fleet permissions api to determine user privilege to fleet', async () => {
    render();
    await waitForNextUpdate();
    await fleetApiMock.waitForApi();
    expect(useHttp().get as jest.Mock).toHaveBeenCalledWith(
      appRoutesService.getCheckPermissionsPath()
    );
  });

  it('should set privileges to false if user does not have superuser role', async () => {
    authenticatedUser.roles = [];
    render();
    await waitForNextUpdate();
    await fleetApiMock.waitForApi();
    expect(result.current).toEqual(
      getEndpointPrivilegesInitialStateMock({
        canAccessEndpointManagement: false,
      })
    );
  });

  it('should set privileges to false if fleet api check returns failure', async () => {
    fleetApiMock.responseProvider.checkPermissions.mockReturnValue({
      error: 'MISSING_SECURITY',
      success: false,
    });

    render();
    await waitForNextUpdate();
    await fleetApiMock.waitForApi();
    expect(result.current).toEqual(
      getEndpointPrivilegesInitialStateMock({
        canAccessEndpointManagement: false,
        canAccessFleet: false,
      })
    );
  });

  it.each([['canIsolateHost'], ['canCreateArtifactsByPolicy']])(
    'should set %s to false if license is not PlatinumPlus',
    async (privilege) => {
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
      render();
      await waitForNextUpdate();
      expect(result.current).toEqual(expect.objectContaining({ [privilege]: false }));
    }
  );
});
