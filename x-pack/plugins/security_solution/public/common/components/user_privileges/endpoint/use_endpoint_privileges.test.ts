/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult, RenderResult } from '@testing-library/react-hooks';
import { act, renderHook } from '@testing-library/react-hooks';

import { securityMock } from '@kbn/security-plugin/public/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { createFleetAuthzMock } from '@kbn/fleet-plugin/common/mocks';

import type { EndpointPrivileges } from '../../../../../common/endpoint/types';
import { useCurrentUser, useKibana, useHttp as _useHttp } from '../../../lib/kibana';
import { licenseService } from '../../../hooks/use_license';
import { useEndpointPrivileges } from './use_endpoint_privileges';
import { getEndpointPrivilegesInitialStateMock } from './mocks';
import { getEndpointPrivilegesInitialState } from './utils';
import { exceptionsListAllHttpMocks } from '../../../../management/mocks';
import { getDeferred } from '../../../../management/mocks/utils';
import { waitFor } from '@testing-library/react';
import type { HttpFetchOptionsWithPath, HttpSetup } from '@kbn/core-http-browser';

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
jest.mock('../../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn((feature: string) => feature === 'endpointRbacEnabled'),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useHttpMock = _useHttp as jest.Mock;
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
    useKibanaMock().services.fleet!.authz = createFleetAuthzMock();
    useKibanaMock().services.application.capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      siem: {
        crud: true,
        show: true,
      },
    };

    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    render = () => {
      const hookRenderResponse = renderHook(() => useEndpointPrivileges());
      ({ result, unmount } = hookRenderResponse);
      return hookRenderResponse;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    unmount();
  });

  it('should return `loading: true` while retrieving privileges', async () => {
    (useCurrentUser as jest.Mock).mockReturnValue(null);

    const { rerender } = render();

    expect(result.current).toEqual(getEndpointPrivilegesInitialState());

    // Make user service available
    (useCurrentUser as jest.Mock).mockReturnValue(authenticatedUser);
    rerender();

    expect(result.current).toEqual(getEndpointPrivilegesInitialStateMock());
  });

  it.each([
    ['HIE exist', true],
    ['No HIE exist', false],
  ])(
    `should check if Host Isolation Exceptions exist when license is not Platinum+ (%s)`,
    async (_, hasHIE) => {
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
      const http = useKibanaMock().services.http as jest.Mocked<HttpSetup>;
      const deferred = getDeferred();
      const apiMock = exceptionsListAllHttpMocks(http);

      useHttpMock.mockReturnValue(http);

      const apiResponse = apiMock.responseProvider.exceptionsFind({
        query: {},
      } as HttpFetchOptionsWithPath);
      apiMock.responseProvider.exceptionsFind.mockImplementation(() => {
        if (hasHIE) {
          return apiResponse;
        }
        return {
          ...apiResponse,
          total: 0,
          data: [],
        };
      });

      // Hold on to the Host Isolation Exceptions API all
      apiMock.responseProvider.exceptionsFind.mockDelay.mockReturnValue(deferred.promise);

      const { rerender } = render();

      expect(result.current).toEqual(getEndpointPrivilegesInitialState());

      // release HIE api call
      act(() => {
        deferred.resolve();
      });
      rerender();

      await waitFor(() => {
        expect(apiMock.responseProvider.exceptionsFind).toHaveBeenCalled();
      });

      expect(result.current).toEqual(
        getEndpointPrivilegesInitialStateMock({
          canCreateArtifactsByPolicy: false,
          canIsolateHost: false,
          canAccessEndpointActionsLogManagement: false,
          canWriteHostIsolationExceptions: false,
          canReadHostIsolationExceptions: hasHIE,
          canDeleteHostIsolationExceptions: hasHIE,
        })
      );
    }
  );
});
