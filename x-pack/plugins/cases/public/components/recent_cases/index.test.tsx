/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { configure, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentCases from '.';
import { TestProviders } from '../../common/mock';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCasesMockState } from '../../containers/mock';
jest.mock('../../containers/use_get_cases');
configure({ testIdAttribute: 'data-test-subj' });
const defaultProps = {
  allCasesNavigation: {
    href: 'all-cases-href',
    onClick: jest.fn(),
  },
  caseDetailsNavigation: {
    href: () => 'case-details-href',
    onClick: jest.fn(),
  },
  createCaseNavigation: {
    href: 'create-details-href',
    onClick: jest.fn(),
  },
  maxCasesToShow: 10,
};
const setFilters = jest.fn();
const mockData = {
  ...useGetCasesMockState,
  setFilters,
};
const useGetCasesMock = useGetCases as jest.Mock;
describe('RecentCases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCasesMock.mockImplementation(() => mockData);
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
    expect(getAllByTestId('case-details-link')).toHaveLength(5);
  });
  it('is good at rendering max cases', () => {
    render(
      <TestProviders>
        <RecentCases {...{ ...defaultProps, maxCasesToShow: 2 }} />
      </TestProviders>
    );
    expect(useGetCasesMock).toBeCalledWith({ perPage: 2 });
  });
  it('updates filters', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RecentCases {...defaultProps} />
      </TestProviders>
    );
    const yo = getByTestId('myRecentlyReported');
    userEvent.click(yo);
    expect(setFilters).toHaveBeenCalled();
  });
});
