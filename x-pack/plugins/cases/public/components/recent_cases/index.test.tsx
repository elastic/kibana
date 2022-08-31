/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { configure } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentCases, { RecentCasesProps } from '.';
import { AppMockRenderer, createAppMockRenderer, TestProviders } from '../../common/mock';
import { useGetCasesMockState } from '../../containers/mock';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles } from '../../containers/user_profiles/api.mock';

jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../common/navigation/hooks');

configure({ testIdAttribute: 'data-test-subj' });
const defaultProps: RecentCasesProps = {
  maxCasesToShow: 10,
};

const mockData = {
  ...useGetCasesMockState,
};

const useGetCasesMock = useGetCases as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;

describe('RecentCases', () => {
  let appMockRender: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCasesMock.mockImplementation(() => mockData);
    useGetCurrentUserProfileMock.mockReturnValue({ data: userProfiles[0] });
    appMockRender = createAppMockRenderer();
  });

  it('shows a loading status', () => {
    useGetCasesMock.mockImplementation(() => ({
      ...mockData,
      isLoading: true,
    }));

    const { getAllByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );
    expect(getAllByTestId('loadingPlaceholders')).toHaveLength(3);
  });

  it('render cases', () => {
    const { getAllByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );
    expect(getAllByTestId('case-details-link')).toHaveLength(8);
  });

  it('render max cases correctly', () => {
    appMockRender.render(
      <TestProviders>
        <RecentCases {...{ ...defaultProps, maxCasesToShow: 2 }} />
      </TestProviders>
    );
    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { assignees: [] },
      queryParams: { perPage: 2 },
    });
  });

  it('sets the reporter filters correctly', () => {
    const { getByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { assignees: [] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    const myRecentCasesElement = getByTestId('myRecentlyReported');
    userEvent.click(myRecentCasesElement);

    expect(useGetCasesMock).toHaveBeenLastCalledWith({
      filterOptions: {
        assignees: [userProfiles[0].uid],
      },
      queryParams: { perPage: 10 },
    });

    // remove the filter
    const recentCasesElement = getByTestId('recentlyCreated');
    userEvent.click(recentCasesElement);

    expect(useGetCasesMock).toHaveBeenLastCalledWith({
      filterOptions: {
        assignees: [],
      },
      queryParams: { perPage: 10 },
    });
  });
});
