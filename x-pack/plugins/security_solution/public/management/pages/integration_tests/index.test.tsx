/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ManagementContainer } from '..';
import '../../../common/mock/match_media';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { endpointPageHttpMock } from '../endpoint_hosts/mocks';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../../common/experimental_features';

jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('when in the Administration tab', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  const mockedContext = createAppRootMockRenderer();

  beforeAll(() => {
    ExperimentalFeaturesService.init({
      experimentalFeatures: { ...allowedExperimentalValues },
    });
  });

  beforeEach(() => {
    endpointPageHttpMock(mockedContext.coreStart.http);
    render = () => mockedContext.render(<ManagementContainer />);
    mockedContext.history.push('/administration/endpoints');
  });

  afterEach(() => {
    useUserPrivilegesMock.mockReset();
  });

  describe('when the user has no permissions', () => {
    // remove this beforeAll hook when feature flag is removed
    beforeAll(() => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, endpointRbacEnabled: true },
      });
    });

    it('should display `no permission` if no `canAccessEndpointManagement`', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canAccessEndpointManagement: false },
      });

      expect(await render().findByTestId('noPrivilegesPage')).toBeTruthy();
    });

    it('should display `no permission` if no `canReadPolicyManagement`', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadPolicyManagement: false },
      });

      mockedContext.history.push('/administration/policy');
      expect(await render().findByTestId('noPrivilegesPage')).toBeTruthy();
    });

    it('should display `no permission` if no `canReadTrustedApplications`', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadTrustedApplications: false },
      });

      mockedContext.history.push('/administration/trusted_apps');
      expect(await render().findByTestId('noPrivilegesPage')).toBeTruthy();
    });

    it('should display `no permission` if no `canReadEventFilters`', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadEventFilters: false },
      });

      mockedContext.history.push('/administration/event_filters');
      expect(await render().findByTestId('noPrivilegesPage')).toBeTruthy();
    });

    it('should display `no permission` if no `canReadHostIsolationExceptions`', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadHostIsolationExceptions: false },
      });

      mockedContext.history.push('/administration/host_isolation_exceptions');
      expect(await render().findByTestId('noPrivilegesPage')).toBeTruthy();
    });

    it('should display `no permission` if no `canReadBlocklist`', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadBlocklist: false },
      });

      mockedContext.history.push('/administration/blocklist');
      expect(await render().findByTestId('noPrivilegesPage')).toBeTruthy();
    });

    it('should display `no permission` if no `canReadActionsLogManagement`', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadActionsLogManagement: false },
      });

      mockedContext.history.push('/administration/response_actions_history');
      expect(await render().findByTestId('noPrivilegesPage')).toBeTruthy();
    });
  });

  describe('when the user has permissions', () => {
    // remove this beforeAll hook when feature flag is removed
    beforeAll(() => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, endpointRbacEnabled: true },
      });
    });

    it('should display the Management view if user has privileges', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadEndpointList: true, canAccessFleet: true },
      });

      expect(await render().findByTestId('endpointPage')).toBeTruthy();
    });

    it('should display policy list page when `canReadPolicyManagement` is TRUE', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadPolicyManagement: true },
      });

      mockedContext.history.push('/administration/policy');
      expect(await render().findByTestId('policyListPage')).toBeTruthy();
    });

    it('should display trusted apps list page when `canReadTrustedApplications` is TRUE', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadTrustedApplications: true },
      });

      mockedContext.history.push('/administration/trusted_apps');
      expect(await render().findByTestId('trustedAppsListPage-container')).toBeTruthy();
    });

    it('should display event filters list page when `canReadEventFilters` is TRUE', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadEventFilters: true },
      });

      mockedContext.history.push('/administration/event_filters');
      expect(await render().findByTestId('EventFiltersListPage-container')).toBeTruthy();
    });

    it('should display blocklist list page when `canReadBlocklist` is TRUE', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadBlocklist: true },
      });

      mockedContext.history.push('/administration/blocklist');
      expect(await render().findByTestId('blocklistPage-container')).toBeTruthy();
    });

    it('should display response actions history page when `canReadActionsLogManagement` is TRUE', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: { loading: false, canReadActionsLogManagement: true },
      });

      mockedContext.history.push('/administration/response_actions_history');
      expect(await render().findByTestId('responseActionsPage')).toBeTruthy();
    });
  });
});
