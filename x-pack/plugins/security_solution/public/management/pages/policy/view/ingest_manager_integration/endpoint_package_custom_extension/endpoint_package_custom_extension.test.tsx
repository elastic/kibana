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
import { useUserPrivileges as _useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../../../common/components/user_privileges/__mocks__';

jest.mock('../../../../../../common/components/user_privileges');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('When displaying the EndpointPackageCustomExtension fleet UI extension', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  const artifactCards = Object.freeze([
    'trustedApps-fleetCard',
    'eventFilters-fleetCard',
    'hostIsolationExceptions-fleetCard',
    'blocklists-fleetCard',
  ]);

  beforeEach(() => {
    const mockedTestContext = createFleetContextRendererMock();
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

  it.each([...artifactCards])('should show artifact card: `%s`', (artifactCardtestId) => {
    render();

    expect(renderResult.getByTestId(artifactCardtestId)).toBeTruthy();
  });

  it.each([...artifactCards])(
    'should NOT show artifact card if no endpoint management authz: %s',
    (artifactCardTestId) => {
      useUserPrivilegesMock.mockReturnValue({
        ...getUserPrivilegesMockDefaultValue(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadBlocklist: false,
          canReadEventFilters: false,
          canReadHostIsolationExceptions: false,
          canDeleteHostIsolationExceptions: false,
          canReadTrustedApplications: false,
        }),
      });

      render();

      expect(renderResult.queryByTestId(artifactCardTestId)).toBeNull();
      expect(renderResult.queryByTestId('noPrivilegesPage')).toBeTruthy();
    }
  );

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
