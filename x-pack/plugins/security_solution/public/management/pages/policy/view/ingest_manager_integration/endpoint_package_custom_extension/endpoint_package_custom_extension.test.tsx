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
    useEndpointPrivilegesMock.mockReturnValue(getEndpointPrivilegesInitialStateMock());
  });

  it.each([
    ['trusted apps', 'trustedApps-fleetCard'],
    ['event filters', 'eventFilters-fleetCard'],
    ['host isolation exceptions', 'hostIsolationExceptions-fleetCard'],
    ['bLocklist', 'blocklists-fleetCard'],
  ])('should show %s card', (_, testId) => {
    render();

    expect(renderResult.getByTestId(testId)).toBeTruthy();
  });

  it('should show Host Isolations Exceptions if user has no authz but entries exist', async () => {
    useEndpointPrivilegesMock.mockReturnValue({
      ...getEndpointPrivilegesInitialStateMock(),
      canIsolateHost: false,
    });
    // Mock APIs. Using Trusted Apps http mock here, which will still work
    // for exceptions since the mocks don't currently check for list id
    exceptionsListAllHttpMocks(http);
    render();

    await waitFor(() => {
      expect(renderResult.getByTestId('hostIsolationExceptions-fleetCard')).toBeTruthy();
    });
  });

  it('should NOT show Host Isolation Exceptions if user has no authz and no entries exist', () => {
    useEndpointPrivilegesMock.mockReturnValue({
      ...getEndpointPrivilegesInitialStateMock(),
      canIsolateHost: false,
    });
    render();

    expect(renderResult.queryByTestId('hostIsolationExceptions-fleetCard')).toBeNull();
  });
});
