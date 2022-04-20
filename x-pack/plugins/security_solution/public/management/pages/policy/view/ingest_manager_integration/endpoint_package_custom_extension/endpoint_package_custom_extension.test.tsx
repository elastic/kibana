/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createFleetContextRendererMock, generateFleetPackageInfo } from '../mocks';
import { EndpointPackageCustomExtension } from './endpoint_package_custom_extension';
import { useEndpointPrivileges as _useEndpointPrivileges } from '../../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../../common/components/user_privileges/endpoint/mocks';
import { exceptionsListAllHttpMocks } from '../../../../mocks/exceptions_list_http_mocks';
import { waitFor } from '@testing-library/react';

jest.mock('../../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');
const useEndpointPrivilegesMock = _useEndpointPrivileges as jest.Mock;

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
    useEndpointPrivilegesMock.mockImplementation(getEndpointPrivilegesInitialStateMock);
  });

  it('should show artifact cards', async () => {
    render();

    await waitFor(() => {
      artifactCards.forEach((artifactCard) => {
        expect(renderResult.getByTestId(artifactCard)).toBeTruthy();
      });
    });
  });

  it('should NOT show artifact cards if no endpoint management authz', async () => {
    useEndpointPrivilegesMock.mockReturnValue({
      ...getEndpointPrivilegesInitialStateMock(),
      canAccessEndpointManagement: false,
    });
    render();

    await waitFor(() => {
      artifactCards.forEach((artifactCard) => {
        expect(renderResult.queryByTestId(artifactCard)).toBeNull();
      });
      expect(renderResult.queryByTestId('noIngestPermissions')).toBeTruthy();
    });
  });

  it('should show Host Isolations Exceptions if user has no authz but entries exist', async () => {
    useEndpointPrivilegesMock.mockReturnValue({
      ...getEndpointPrivilegesInitialStateMock(),
      canIsolateHost: false,
    });
    // Mock APIs
    exceptionsListAllHttpMocks(http);
    render();

    await waitFor(() => {
      expect(renderResult.getByTestId('hostIsolationExceptions-fleetCard')).toBeTruthy();
    });
  });

  it('should NOT show Host Isolation Exceptions if user has no authz and no entries exist', async () => {
    useEndpointPrivilegesMock.mockReturnValue({
      ...getEndpointPrivilegesInitialStateMock(),
      canIsolateHost: false,
    });
    render();

    await waitFor(() => {
      expect(renderResult.queryByTestId('hostIsolationExceptions-fleetCard')).toBeNull();
    });
  });
});
