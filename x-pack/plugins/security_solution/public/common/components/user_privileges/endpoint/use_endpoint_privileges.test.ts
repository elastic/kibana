/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, RenderHookResult, RenderResult } from '@testing-library/react-hooks';
import { useHttp, useCurrentUser } from '../../../lib/kibana';
import { useEndpointPrivileges } from './use_endpoint_privileges';
import { securityMock } from '../../../../../../security/public/mocks';
import { AuthenticatedUser } from '../../../../../../security/common';
import { licenseService } from '../../../hooks/use_license';
import { fleetGetCheckPermissionsHttpMock } from '../../../../management/pages/mocks';
import { getEndpointPrivilegesInitialStateMock } from './mocks';
import { EndpointPrivileges } from '../../../../../common/endpoint/types';

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
      await fleetApiMock.waitForApi();
      releaseApiResponse!();
    });
    expect(result.current).toEqual(getEndpointPrivilegesInitialStateMock());
  });

  it('should set privileges to false if user does not have `all` fleet privileges', async () => {
    expect(true).toBe(false);
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
