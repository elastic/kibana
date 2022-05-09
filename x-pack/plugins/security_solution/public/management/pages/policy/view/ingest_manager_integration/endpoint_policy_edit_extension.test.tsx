/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { PackagePolicy, NewPackagePolicy } from '@kbn/fleet-plugin/common';

import { useEndpointPrivileges } from '../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../common/components/user_privileges/endpoint/mocks';
import { composeHttpHandlerMocks } from '../../../../../common/mock/endpoint/http_handler_mock_factory';
import { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { fleetGetAgentStatusHttpMock, fleetGetEndpointPackagePolicyHttpMock } from '../../../mocks';
import { EndpointPolicyEditExtension } from './endpoint_policy_edit_extension';
import { createFleetContextRendererMock } from './mocks';

jest.mock('../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');
jest.mock('../../../../../common/components/user_privileges');
const useEndpointPrivilegesMock = useEndpointPrivileges as jest.Mock;
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('When displaying the EndpointPolicyEditExtension fleet UI extension', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  const artifactCards = Object.freeze([
    'trustedApps-fleet-integration-card',
    'eventFilters-fleet-integration-card',
    'hostIsolationExceptions-fleet-integration-card',
    'blocklists-fleet-integration-card',
  ]);

  beforeEach(() => {
    useEndpointPrivilegesMock.mockReturnValue(getEndpointPrivilegesInitialStateMock());
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
    });
    const mockedTestContext = createFleetContextRendererMock();
    composeHttpHandlerMocks([fleetGetEndpointPackagePolicyHttpMock, fleetGetAgentStatusHttpMock]);

    render = () =>
      mockedTestContext.render(
        <EndpointPolicyEditExtension
          policy={{ id: 'someid' } as PackagePolicy}
          newPolicy={{ id: 'someid' } as NewPackagePolicy}
          onChange={jest.fn()}
        />
      );
  });

  it('should show artifact cards', async () => {
    const renderResult = render();

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
    const renderResult = render();

    await waitFor(() => {
      artifactCards.forEach((artifactCard) => {
        expect(renderResult.queryByTestId(artifactCard)).toBeNull();
      });
    });
  });
});
