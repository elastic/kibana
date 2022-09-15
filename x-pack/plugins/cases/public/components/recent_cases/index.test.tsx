/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { configure, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentCases, { RecentCasesProps } from '.';
import { AppMockRenderer, createAppMockRenderer, TestProviders } from '../../common/mock';
import { useGetCasesMockState } from '../../containers/mock';
// import * as kibanaHooks from '../../common/lib/kibana/hooks';
import { useCurrentUser } from '../../common/lib/kibana/hooks';
import { useGetCases } from '../../containers/use_get_cases';
import * as api from '../../containers/user_profiles/api';
import { useToasts } from '../../common/lib/kibana';

// jest.mock('../../common/lib/kibana');
jest.mock('../../containers/user_profiles/api');
jest.mock('../../containers/use_get_cases');
jest.mock('../../common/lib/kibana/hooks');
jest.mock('../../common/navigation/hooks');

configure({ testIdAttribute: 'data-test-subj' });
const defaultProps: RecentCasesProps = {
  maxCasesToShow: 10,
};

const mockData = {
  ...useGetCasesMockState,
};

const useGetCasesMock = useGetCases as jest.Mock;
const useCurrentUserMock = useCurrentUser as jest.Mock;

describe('RecentCases', () => {
  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCasesMock.mockImplementation(() => mockData);
    useCurrentUserMock.mockReturnValue({
      email: 'elastic@elastic.co',
      fullName: 'Elastic',
      username: 'elastic',
    });

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
      filterOptions: { reporters: [] },
      queryParams: { perPage: 2 },
    });
  });

  it('sets the reporter filters correctly', async () => {
    const { getByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    await waitFor(() => {
      const myRecentCasesElement = getByTestId('myRecentlyReported');
      userEvent.click(myRecentCasesElement);
    });

    expect(useGetCasesMock).toHaveBeenLastCalledWith({
      filterOptions: {
        reporters: [
          {
            email: 'damaged_raccoon@elastic.co',
            full_name: 'Damaged Raccoon',
            profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
            username: 'damaged_raccoon',
          },
        ],
      },
      queryParams: { perPage: 10 },
    });

    // remove the filter
    const recentCasesElement = getByTestId('recentlyCreated');
    userEvent.click(recentCasesElement);

    expect(useGetCasesMock).toHaveBeenLastCalledWith({
      filterOptions: {
        reporters: [],
      },
      queryParams: { perPage: 10 },
    });
  });

  it('sets the reporter filters correctly when it cannot find the current user profile', async () => {
    const spyOnGetCurrentUserProfile = jest.spyOn(api, 'getCurrentUserProfile');
    // @ts-expect-error expects a UserProfile type but we want to test with undefined
    spyOnGetCurrentUserProfile.mockResolvedValue(undefined);

    const { getByTestId } = appMockRender.render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: { reporters: [] },
      queryParams: { perPage: 10 },
    });

    // apply the filter
    await waitFor(() => {
      const myRecentCasesElement = getByTestId('myRecentlyReported');
      userEvent.click(myRecentCasesElement);
    });

    expect(useGetCasesMock).toHaveBeenLastCalledWith({
      filterOptions: {
        reporters: [
          {
            email: 'elastic@elastic.co',
            full_name: 'Elastic',
            username: 'elastic',
          },
        ],
      },
      queryParams: { perPage: 10 },
    });
  });
});
