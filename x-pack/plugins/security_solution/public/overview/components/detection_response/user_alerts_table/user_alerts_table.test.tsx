/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fireEvent, render } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock';
import { parsedVulnerableUserAlertsResult } from './mock_data';
import type { UseUserAlertsItems } from './use_user_alerts_items';
import { UserAlertsTable } from './user_alerts_table';
import { openAlertsFilter } from '../utils';

const userName = 'crffn20qcs';
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

const mockOpenTimelineWithFilters = jest.fn();
jest.mock('../hooks/use_navigate_to_timeline', () => {
  return {
    useNavigateToTimeline: () => ({
      openTimelineWithFilters: mockOpenTimelineWithFilters,
    }),
  };
});

type UseUserAlertsItemsReturn = ReturnType<UseUserAlertsItems>;
const defaultUseUserAlertsItemsReturn: UseUserAlertsItemsReturn = {
  items: [],
  isLoading: false,
  updatedAt: Date.now(),
  pagination: {
    currentPage: 0,
    pageCount: 0,
    setPage: () => null,
  },
};
const mockUseUserAlertsItems = jest.fn(() => defaultUseUserAlertsItemsReturn);
const mockUseUserAlertsItemsReturn = (overrides: Partial<UseUserAlertsItemsReturn>) => {
  mockUseUserAlertsItems.mockReturnValueOnce({ ...defaultUseUserAlertsItemsReturn, ...overrides });
};

jest.mock('./use_user_alerts_items', () => ({
  useUserAlertsItems: () => mockUseUserAlertsItems(),
}));

const renderComponent = () =>
  render(
    <TestProviders>
      <UserAlertsTable signalIndexName="some signal index" />
    </TestProviders>
  );

describe('UserAlertsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty table', () => {
    const { getByText, queryByTestId } = renderComponent();

    expect(queryByTestId('severityUserAlertsPanel')).toBeInTheDocument();
    expect(queryByTestId('userTablePaginator')).not.toBeInTheDocument();
    expect(getByText('No alerts to display')).toBeInTheDocument();
  });

  it('should render a loading table', () => {
    mockUseUserAlertsItemsReturn({ isLoading: true });
    const { getByText, queryByTestId } = renderComponent();

    expect(getByText('Updating...')).toBeInTheDocument();
    expect(queryByTestId('severityUserAlertsTable')).toHaveClass('euiBasicTable-loading');
    expect(queryByTestId('userTablePaginator')).not.toBeInTheDocument();
  });

  it('should render the updated at subtitle', () => {
    mockUseUserAlertsItemsReturn({ isLoading: false });
    const { getByText } = renderComponent();

    expect(getByText(/Updated/)).toBeInTheDocument();
  });

  it('should render the table columns', () => {
    mockUseUserAlertsItemsReturn({ items: parsedVulnerableUserAlertsResult });
    const { getAllByRole } = renderComponent();

    const columnHeaders = getAllByRole('columnheader');
    expect(columnHeaders.at(0)).toHaveTextContent('User name');
    expect(columnHeaders.at(1)).toHaveTextContent('Alerts');
    expect(columnHeaders.at(2)).toHaveTextContent('Critical');
    expect(columnHeaders.at(3)).toHaveTextContent('High');
    expect(columnHeaders.at(4)).toHaveTextContent('Medium');
    expect(columnHeaders.at(5)).toHaveTextContent('Low');
  });

  it('should render the table items', () => {
    mockUseUserAlertsItemsReturn({ items: [parsedVulnerableUserAlertsResult[0]] });
    const { queryByTestId } = renderComponent();

    expect(queryByTestId('userSeverityAlertsTable-userName')).toHaveTextContent(userName);
    expect(queryByTestId('userSeverityAlertsTable-totalAlerts')).toHaveTextContent('4');
    expect(queryByTestId('userSeverityAlertsTable-critical')).toHaveTextContent('4');
    expect(queryByTestId('userSeverityAlertsTable-high')).toHaveTextContent('1');
    expect(queryByTestId('userSeverityAlertsTable-medium')).toHaveTextContent('1');
    expect(queryByTestId('userSeverityAlertsTable-low')).toHaveTextContent('1');
    expect(queryByTestId('userTablePaginator')).not.toBeInTheDocument();
  });

  it('should render the paginator if more than 4 results', () => {
    const mockSetPage = jest.fn();

    mockUseUserAlertsItemsReturn({
      pagination: {
        currentPage: 1,
        pageCount: 3,
        setPage: mockSetPage,
      },
    });
    const { queryByTestId, getByText } = renderComponent();
    const page3 = getByText('3');
    expect(queryByTestId('userTablePaginator')).toBeInTheDocument();

    fireEvent.click(page3);
    expect(mockSetPage).toHaveBeenCalledWith(2);
  });

  it('should open timeline with filters when total alerts is clicked', () => {
    mockUseUserAlertsItemsReturn({ items: [parsedVulnerableUserAlertsResult[0]] });
    const { getByTestId } = renderComponent();

    fireEvent.click(getByTestId('userSeverityAlertsTable-totalAlertsLink'));

    expect(mockOpenTimelineWithFilters).toHaveBeenCalledWith([
      [
        {
          field: 'user.name',
          value: userName,
        },
        openAlertsFilter,
      ],
    ]);
  });

  it('should open timeline with filters when critical alerts link is clicked', () => {
    mockUseUserAlertsItemsReturn({ items: [parsedVulnerableUserAlertsResult[0]] });
    const { getByTestId } = renderComponent();

    fireEvent.click(getByTestId('userSeverityAlertsTable-criticalLink'));

    expect(mockOpenTimelineWithFilters).toHaveBeenCalledWith([
      [
        {
          field: 'user.name',
          value: userName,
        },
        openAlertsFilter,
        {
          field: 'kibana.alert.severity',
          value: 'critical',
        },
      ],
    ]);
  });
});
