/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import type { PackagePolicy, NewPackagePolicy } from '@kbn/fleet-plugin/common';

import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../../common/components/user_privileges/endpoint/mocks';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { EndpointPolicyEditExtension } from './endpoint_policy_edit_extension';
import { createFleetContextRendererMock } from '../mocks';

jest.mock('../../../../../../common/components/user_privileges');
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
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
    });

    const mockedTestContext = createFleetContextRendererMock();

    render = () =>
      mockedTestContext.render(
        <EndpointPolicyEditExtension
          policy={{ id: 'someid' } as PackagePolicy}
          newPolicy={{ id: 'someid' } as NewPackagePolicy}
          onChange={jest.fn()}
        />
      );
  });

  it.each([...artifactCards])('should show artifact card `%s`', async (artifactCardTestId) => {
    const renderResult = render();

    await waitFor(() => {
      expect(renderResult.getByTestId(artifactCardTestId)).toBeTruthy();
    });
  });

  it('should NOT show artifact cards if no endpoint management authz', async () => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({
        canReadTrustedApplications: false,
        canReadEventFilters: false,
        canReadBlocklist: false,
        canReadHostIsolationExceptions: false,
      }),
    });
    const renderResult = render();

    await waitFor(() => {
      artifactCards.forEach((artifactCard) => {
        expect(renderResult.queryByTestId(artifactCard)).toBeNull();
      });
    });
  });

  it.each([
    ['trustedApps', 'trusted_apps'],
    ['eventFilters', 'event_filters'],
    ['hostIsolationExceptions', 'host_isolation_exceptions'],
    ['blocklists', 'blocklist'],
  ])(
    'should link to the %s list page if no Authz for policy management',
    async (artifactTestIdPrefix, pageUrlName) => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadPolicyManagement: false,
        }),
      });

      const { getByTestId } = render();

      await waitFor(() => {
        expect(
          getByTestId(`${artifactTestIdPrefix}-link-to-exceptions`).getAttribute('href')
        ).toEqual(`/app/security/administration/${pageUrlName}?includedPolicies=someid%2Cglobal`);
      });
    }
  );
});
