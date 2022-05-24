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
import { TestProviders } from '../../common/mock';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetReporters } from '../../containers/use_get_reporters';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { useConnectors } from '../../containers/configure/use_connectors';
import { CaseStatuses } from '../../../common/api';
import { casesStatus, connectorsMock, useGetCasesMockState } from '../../containers/mock';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';

jest.mock('../../containers/use_get_reporters');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/api');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_cases_status');

const useConnectorsMock = useConnectors as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetCasesStatusMock = useGetCasesStatus as jest.Mock;
const useGetActionLicenseMock = useGetActionLicense as jest.Mock;

describe('AllCases', () => {
  const dispatchUpdateCaseProperty = jest.fn();
  const refetchCases = jest.fn();
  const setFilters = jest.fn();
  const setQueryParams = jest.fn();
  const setSelectedCases = jest.fn();
  const fetchCasesStatus = jest.fn();

  const defaultGetCases = {
    ...useGetCasesMockState,
    dispatchUpdateCaseProperty,
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
    actionLicense: null,
    isLoading: false,
    isError: false,
  };

  beforeAll(() => {
    (useGetTags as jest.Mock).mockReturnValue({ tags: ['coke', 'pepsi'], fetchTags: jest.fn() });
    (useGetReporters as jest.Mock).mockReturnValue({
      reporters: ['casetester'],
      respReporters: [{ username: 'casetester' }],
      isLoading: true,
      isError: false,
      fetchReporters: jest.fn(),
    });
    (useGetActionLicense as jest.Mock).mockReturnValue({
      actionLicense: null,
      isLoading: false,
    });
    useConnectorsMock.mockImplementation(() => ({ connectors: connectorsMock, loading: false }));
    useGetCasesStatusMock.mockReturnValue(defaultCasesStatus);
    useGetActionLicenseMock.mockReturnValue(defaultActionLicense);
    useGetCasesMock.mockReturnValue(defaultGetCases);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the stats', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: CaseStatuses.closed },
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
      actionLicense: {
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
      actionLicense: {
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
