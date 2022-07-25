/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult, RenderResult } from '@testing-library/react-hooks';
import { act, renderHook } from '@testing-library/react-hooks';
import { useCurrentUser, useKibana } from '../../../lib/kibana';
import { useEndpointPrivileges } from './use_endpoint_privileges';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { licenseService } from '../../../hooks/use_license';
import { getEndpointPrivilegesInitialStateMock } from './mocks';
import type { EndpointPrivileges } from '../../../../../common/endpoint/types';
import { getEndpointPrivilegesInitialState } from './utils';

jest.mock('../../../lib/kibana');
jest.mock('../../../hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isEnterprise: jest.fn(() => true),
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
  let result: RenderResult<EndpointPrivileges>;
  let unmount: ReturnType<typeof renderHook>['unmount'];
  let render: () => RenderHookResult<void, EndpointPrivileges>;

  beforeEach(() => {
    authenticatedUser = securityMock.createMockAuthenticatedUser({
      roles: ['superuser'],
    });

    (useCurrentUser as jest.Mock).mockReturnValue(authenticatedUser);

    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    render = () => {
      const hookRenderResponse = renderHook(() => useEndpointPrivileges());
      ({ result, unmount } = hookRenderResponse);
      return hookRenderResponse;
    };
  });

  afterEach(() => {
    unmount();
  });

  it('should return `loading: true` while retrieving privileges', async () => {
    (useCurrentUser as jest.Mock).mockReturnValue(null);

    const { rerender } = render();
    expect(result.current).toEqual(getEndpointPrivilegesInitialState());

    // Make user service available
    (useCurrentUser as jest.Mock).mockReturnValue(authenticatedUser);
    rerender();
    expect(result.current).toEqual(getEndpointPrivilegesInitialState());

    // Release the API response
    await act(async () => {
      await useKibana().services.fleet!.authz;
    });

    expect(result.current).toEqual(getEndpointPrivilegesInitialStateMock());
  });
});
