/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { configure, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentCases, { RecentCasesProps } from '.';
import { TestProviders } from '../../common/mock';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCasesMockState } from '../../containers/mock';
import { useCurrentUser } from '../../common/lib/kibana/hooks';

jest.mock('../../containers/use_get_cases');
jest.mock('../../common/lib/kibana/hooks');
jest.mock('../../common/navigation/hooks');

configure({ testIdAttribute: 'data-test-subj' });
const defaultProps: RecentCasesProps = {
  maxCasesToShow: 10,
};

const setFilters = jest.fn();
const mockData = {
  ...useGetCasesMockState,
  setFilters,
};

const useGetCasesMock = useGetCases as jest.Mock;
const useCurrentUserMock = useCurrentUser as jest.Mock;

describe('RecentCases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCasesMock.mockImplementation(() => mockData);
    useCurrentUserMock.mockResolvedValue({
      email: 'elastic@elastic.co',
      fullName: 'Elastic',
      username: 'elastic',
    });
  });

  it('is good at loading', () => {
    useGetCasesMock.mockImplementation(() => ({
      ...mockData,
      loading: 'cases',
    }));
    const { getAllByTestId } = render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );
    expect(getAllByTestId('loadingPlaceholders')).toHaveLength(3);
  });

  it('is good at rendering cases', () => {
    const { getAllByTestId } = render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );
    expect(getAllByTestId('case-details-link')).toHaveLength(7);
  });

  it('is good at rendering max cases', () => {
    render(
      <TestProviders>
        <RecentCases {...{ ...defaultProps, maxCasesToShow: 2 }} />
      </TestProviders>
    );
    expect(useGetCasesMock).toBeCalledWith({
      initialQueryParams: { perPage: 2 },
    });
  });

  it('updates filters', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );

    const element = getByTestId('myRecentlyReported');
    userEvent.click(element);
    expect(setFilters).toHaveBeenCalled();
  });

  it('it resets the reporters when changing from my recently reported cases to recent cases', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );

    const myRecentCasesElement = getByTestId('myRecentlyReported');
    const recentCasesElement = getByTestId('recentlyCreated');
    userEvent.click(myRecentCasesElement);
    userEvent.click(recentCasesElement);

    const mockCalls = setFilters.mock.calls;
    expect(mockCalls[0][0].reporters.length).toBeGreaterThan(0);
    expect(mockCalls[1][0]).toEqual({ reporters: [] });
  });
});
