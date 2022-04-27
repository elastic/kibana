/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock';
import { parsedRecentCases } from './mock_data';
import { RecentlyCreatedCasesTable } from './recent_cases_table';
import type { UseRecentlyCreatedCases } from './use_recent_cases_items';

const mockGetAppUrl = jest.fn();
jest.mock('../../../../common/lib/kibana/hooks', () => {
  const original = jest.requireActual('../../../../common/lib/kibana/hooks');
  return {
    ...original,
    useNavigation: () => ({
      getAppUrl: mockGetAppUrl,
    }),
  };
});

type UseRecentlyCreatedCasesReturn = ReturnType<UseRecentlyCreatedCases>;
const defaultRecentCaseItemsReturn: UseRecentlyCreatedCasesReturn = {
  items: [],
  isLoading: false,
  updatedAt: Date.now(),
};
const mockUseRecentlyCreatedCases = jest.fn(() => defaultRecentCaseItemsReturn);
const mockUseRecentlyCreatedCasesReturn = (overrides: Partial<UseRecentlyCreatedCasesReturn>) => {
  mockUseRecentlyCreatedCases.mockReturnValueOnce({
    ...defaultRecentCaseItemsReturn,
    ...overrides,
  });
};

jest.mock('./use_recent_cases_items', () => ({
  useRecentlyCreatedCases: () => mockUseRecentlyCreatedCases(),
}));

const renderComponent = () =>
  render(
    <TestProviders>
      <RecentlyCreatedCasesTable />
    </TestProviders>
  );

describe('RecentlyCreatedCasesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty table', () => {
    const { getByText, getByTestId } = renderComponent();

    expect(getByTestId('recentlyCreatedCasesPanel')).toBeInTheDocument();
    expect(getByText('No cases to display')).toBeInTheDocument();
    expect(getByTestId('allCasesButton')).toBeInTheDocument();
  });

  it('should render a loading table', () => {
    mockUseRecentlyCreatedCasesReturn({ isLoading: true });
    const { getByText, getByTestId } = renderComponent();

    expect(getByText('Updating...')).toBeInTheDocument();
    expect(getByTestId('allCasesButton')).toBeInTheDocument();
    expect(getByTestId('recentlyCreatedCasesTable')).toHaveClass('euiBasicTable-loading');
  });

  it('should render the updated at subtitle', () => {
    mockUseRecentlyCreatedCasesReturn({ isLoading: false });
    const { getByText } = renderComponent();

    expect(getByText('Updated now')).toBeInTheDocument();
  });

  it('should render the table columns', () => {
    mockUseRecentlyCreatedCasesReturn({ items: parsedRecentCases });
    const { getAllByRole } = renderComponent();

    const columnHeaders = getAllByRole('columnheader');
    expect(columnHeaders.at(0)).toHaveTextContent('Name');
    expect(columnHeaders.at(1)).toHaveTextContent('Note');
    expect(columnHeaders.at(2)).toHaveTextContent('Time');
    expect(columnHeaders.at(3)).toHaveTextContent('Created by');
    expect(columnHeaders.at(4)).toHaveTextContent('Status');
  });

  it('should render the table items', () => {
    mockUseRecentlyCreatedCasesReturn({ items: [parsedRecentCases[0]] });
    const { getByTestId } = renderComponent();

    expect(getByTestId('recentlyCreatedCaseName')).toHaveTextContent('sdcsd');
    expect(getByTestId('recentlyCreatedCaseNote')).toHaveTextContent('klklk');
    expect(getByTestId('recentlyCreatedCaseTime')).toHaveTextContent('April 25, 2022');
    expect(getByTestId('recentlyCreatedCaseCreatedBy')).toHaveTextContent('elastic');
    expect(getByTestId('recentlyCreatedCaseStatus')).toHaveTextContent('Open');
  });
});
