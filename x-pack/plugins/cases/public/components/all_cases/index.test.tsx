/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { AllCases } from '.';
import {
  AppMockRenderer,
  createAppMockRenderer,
  noCreateCasesPermissions,
  TestProviders,
} from '../../common/mock';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { casesStatus, connectorsMock, useGetCasesMockState } from '../../containers/mock';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { useGetConnectors } from '../../containers/configure/use_connectors';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_action_license', () => {
  return {
    useGetActionLicense: jest.fn(),
  };
});
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/api');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_cases_status');
jest.mock('../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');

const useGetConnectorsMock = useGetConnectors as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetCasesStatusMock = useGetCasesStatus as jest.Mock;
const useGetActionLicenseMock = useGetActionLicense as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;

describe('AllCases', () => {
  const refetchCases = jest.fn();
  const setFilters = jest.fn();
  const setQueryParams = jest.fn();
  const setSelectedCases = jest.fn();
  const fetchCasesStatus = jest.fn();

  const defaultGetCases = {
    ...useGetCasesMockState,
    refetchCases,
    setFilters,
    setQueryParams,
    setSelectedCases,
  };

  const defaultCasesStatus = {
    ...casesStatus,
    fetchCasesStatus,
    isError: false,
    isLoading: false,
  };

  const defaultActionLicense = {
    data: null,
    isLoading: false,
    isError: false,
  };

  beforeAll(() => {
    (useGetTags as jest.Mock).mockReturnValue({ data: ['coke', 'pepsi'], refetch: jest.fn() });
    useGetConnectorsMock.mockImplementation(() => ({ data: connectorsMock, isLoading: false }));
    useGetCasesStatusMock.mockReturnValue(defaultCasesStatus);
    useGetActionLicenseMock.mockReturnValue(defaultActionLicense);
    useGetCasesMock.mockReturnValue(defaultGetCases);

    useGetCurrentUserProfileMock.mockReturnValue({ data: userProfiles[0], isLoading: false });
    useBulkGetUserProfilesMock.mockReturnValue({ data: userProfilesMap });
  });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  describe('empty table', () => {
    beforeEach(() => {
      useGetCasesMock.mockReturnValue({
        ...defaultGetCases,
        data: {
          ...defaultGetCases.data,
          cases: [],
          total: 0,
        },
      });
    });

    it('should render the create new case link when the user has create privileges', async () => {
      const result = appMockRender.render(<AllCases />);
      await waitFor(() => {
        expect(result.getByTestId('cases-table-add-case')).toBeInTheDocument();
      });
    });

    it('should not render the create new case link when the user does not have create privileges', async () => {
      appMockRender = createAppMockRenderer({ permissions: noCreateCasesPermissions() });
      const result = appMockRender.render(<AllCases />);
      await waitFor(() => {
        expect(result.queryByTestId('cases-table-add-case')).not.toBeInTheDocument();
      });
    });
  });

  it('should render the stats', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
    });

    const wrapper = mount(
      <TestProviders>
        <AllCases />
      </TestProviders>
    );

    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="openStatsHeader"]').exists()).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="openStatsHeader"] .euiDescriptionList__description')
          .first()
          .text()
      ).toBe('20');

      expect(wrapper.find('[data-test-subj="inProgressStatsHeader"]').exists()).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="inProgressStatsHeader"] .euiDescriptionList__description')
          .first()
          .text()
      ).toBe('40');

      expect(wrapper.find('[data-test-subj="closedStatsHeader"]').exists()).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="closedStatsHeader"] .euiDescriptionList__description')
          .first()
          .text()
      ).toBe('130');
    });
  });

  it('should render the loading spinner when loading stats', async () => {
    useGetCasesStatusMock.mockReturnValue({ ...defaultCasesStatus, isLoading: true });

    const wrapper = mount(
      <TestProviders>
        <AllCases />
      </TestProviders>
    );

    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="openStatsHeader-loading-spinner"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="inProgressStatsHeader-loading-spinner"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="closedStatsHeader-loading-spinner"]').exists()
      ).toBeTruthy();
    });
  });

  it('should not allow the user to enter configuration page with basic license', async () => {
    useGetActionLicenseMock.mockReturnValue({
      ...defaultActionLicense,
      data: {
        id: '.jira',
        name: 'Jira',
        minimumLicenseRequired: 'gold',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: false,
      },
    });

    const wrapper = mount(
      <TestProviders>
        <AllCases />
      </TestProviders>
    );

    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="configure-case-button"]').first().prop('isDisabled')
      ).toBeTruthy();
    });
  });

  it('should allow the user to enter configuration page with gold license and above', async () => {
    useGetActionLicenseMock.mockReturnValue({
      ...defaultActionLicense,
      data: {
        id: '.jira',
        name: 'Jira',
        minimumLicenseRequired: 'gold',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
      },
    });

    const wrapper = mount(
      <TestProviders>
        <AllCases />
      </TestProviders>
    );

    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="configure-case-button"]').first().prop('isDisabled')
      ).toBeFalsy();
    });
  });
});
