/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createFleetContextRendererMock, generateFleetPackageInfo } from '../mocks';
import { EndpointPackageCustomExtension } from './endpoint_package_custom_extension';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../../common/components/user_privileges/endpoint/mocks';
import { exceptionsListAllHttpMocks } from '../../../../../mocks/exceptions_list_http_mocks';
import { waitFor } from '@testing-library/react';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../../../common/components/user_privileges/__mocks__';

jest.mock('../../../../../../common/components/user_privileges');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('When displaying the EndpointPackageCustomExtension fleet UI extension', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let http: AppContextTestRender['coreStart']['http'];
  const artifactCards = Object.freeze([
    'trustedApps-fleetCard',
    'eventFilters-fleetCard',
    'hostIsolationExceptions-fleetCard',
    'blocklists-fleetCard',
  ]);

  beforeEach(() => {
    const mockedTestContext = createFleetContextRendererMock();
    http = mockedTestContext.coreStart.http;
    render = () => {
      renderResult = mockedTestContext.render(
        <EndpointPackageCustomExtension
          pkgkey="endpoint-8.2.0"
          packageInfo={generateFleetPackageInfo()}
        />
      );

      return renderResult;
    };
  });

  afterEach(() => {
    useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
  });

  it.each([...artifactCards])('should show artifact card: `%s`', async (artifactCardtestId) => {
    render();

    await waitFor(() => {
      expect(renderResult.getByTestId(artifactCardtestId)).toBeTruthy();
    });
  });

  it('should NOT show artifact cards if no endpoint management authz', async () => {
    useUserPrivilegesMock.mockReturnValue({
      ...getUserPrivilegesMockDefaultValue(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({
        canReadBlocklist: false,
        canReadEventFilters: false,
        canReadHostIsolationExceptions: false,
        canReadTrustedApplications: false,
        canIsolateHost: false,
      }),
    });

    render();

    await waitFor(() => {
      artifactCards.forEach((artifactCard) => {
        expect(renderResult.queryByTestId(artifactCard)).toBeNull();
      });
      expect(renderResult.queryByTestId('noPrivilegesPage')).toBeTruthy();
    });
  });

  it('should show Host Isolations Exceptions if user has no authz but entries exist', async () => {
    useUserPrivilegesMock.mockReturnValue({
      ...getUserPrivilegesMockDefaultValue(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({ canIsolateHost: false }),
    });
    // Mock APIs
    exceptionsListAllHttpMocks(http);
    render();

    await waitFor(() => {
      expect(renderResult.getByTestId('hostIsolationExceptions-fleetCard')).toBeTruthy();
    });
  });

  it('should NOT show Host Isolation Exceptions if user has no authz and no entries exist', async () => {
    useUserPrivilegesMock.mockReturnValue({
      ...getUserPrivilegesMockDefaultValue(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({
        canReadHostIsolationExceptions: false,
      }),
    });

    render();

    await waitFor(() => {
      expect(renderResult.queryByTestId('hostIsolationExceptions-fleetCard')).toBeNull();
    });
  });

  it('should only show loading spinner if loading', () => {
    useUserPrivilegesMock.mockReturnValue({
      ...getUserPrivilegesMockDefaultValue(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({ loading: true }),
    });

    render();

    expect(renderResult.getByTestId('endpointExtensionLoadingSpinner')).toBeInTheDocument();
    expect(renderResult.queryByTestId('fleetEndpointPackageCustomContent')).toBeNull();
    expect(renderResult.queryByTestId('noIngestPermissions')).toBeNull();
  });
});
