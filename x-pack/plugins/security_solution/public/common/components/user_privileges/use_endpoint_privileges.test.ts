/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, RenderHookResult, RenderResult } from '@testing-library/react-hooks';
import { useHttp, useCurrentUser } from '../../lib/kibana';
import { EndpointPrivileges, useEndpointPrivileges } from './use_endpoint_privileges';
import { fleetGetCheckPermissionsHttpMock } from '../../../management/pages/endpoint_hosts/mocks';
import { securityMock } from '../../../../../security/public/mocks';
import { appRoutesService } from '../../../../../fleet/common';
import { AuthenticatedUser } from '../../../../../security/common';

jest.mock('../../lib/kibana');

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

    render = () => {
      const hookRenderResponse = renderHook(() => useEndpointPrivileges());
      ({ result, unmount, waitForNextUpdate } = hookRenderResponse);
      return hookRenderResponse;
    };
  });

  afterEach(() => {
    unmount();
  });

  it('should return `loading: true` while defining set of privileges', async () => {
    render();
    expect(result.current).toEqual({
      canAccessEndpointManagement: false,
      canAccessFleet: false,
      loading: true,
    });

    await waitForNextUpdate();
    await fleetApiMock.waitForApi();
    expect(result.current).toEqual({
      canAccessEndpointManagement: true,
      canAccessFleet: true,
      loading: false,
    });
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
    expect(result.current).toEqual({
      canAccessEndpointManagement: false,
      canAccessFleet: true, // this is only true here because I did not adjust the API mock
      loading: false,
    });
  });

  it('should set privileges to false if fleet api check returns failure', async () => {
    fleetApiMock.responseProvider.checkPermissions.mockReturnValue({
      error: 'MISSING_SECURITY',
      success: false,
    });

    render();
    await waitForNextUpdate();
    await fleetApiMock.waitForApi();
    expect(result.current).toEqual({
      canAccessEndpointManagement: false,
      canAccessFleet: false,
      loading: false,
    });
  });
});
