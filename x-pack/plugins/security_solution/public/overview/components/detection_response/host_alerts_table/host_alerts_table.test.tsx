/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fireEvent, render } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock';
import { parsedVulnerableHostsAlertsResult } from './mock_data';
import type { UseHostAlertsItems } from './use_host_alerts_items';
import { HostAlertsTable } from './host_alerts_table';
import { openAlertsFilter } from '../utils';

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

type UseHostAlertsItemsReturn = ReturnType<UseHostAlertsItems>;
const defaultUseHostAlertsItemsReturn: UseHostAlertsItemsReturn = {
  items: [],
  isLoading: false,
  updatedAt: Date.now(),
  pagination: {
    currentPage: 0,
    pageCount: 0,
    setPage: () => null,
  },
};
const mockUseHostAlertsItems = jest.fn(() => defaultUseHostAlertsItemsReturn);
const mockUseHostAlertsItemsReturn = (overrides: Partial<UseHostAlertsItemsReturn>) => {
  mockUseHostAlertsItems.mockReturnValueOnce({ ...defaultUseHostAlertsItemsReturn, ...overrides });
};

jest.mock('./use_host_alerts_items', () => ({
  useHostAlertsItems: () => mockUseHostAlertsItems(),
}));

const renderComponent = () =>
  render(
    <TestProviders>
      <HostAlertsTable signalIndexName="some signal index" />
    </TestProviders>
  );

describe('HostAlertsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty table', () => {
    const { getByText, queryByTestId } = renderComponent();

    expect(queryByTestId('severityHostAlertsPanel')).toBeInTheDocument();
    expect(queryByTestId('hostTablePaginator')).not.toBeInTheDocument();
    expect(getByText('No alerts to display')).toBeInTheDocument();
  });

  it('should render a loading table', () => {
    mockUseHostAlertsItemsReturn({ isLoading: true });
    const { getByText, queryByTestId } = renderComponent();

    expect(getByText('Updating...')).toBeInTheDocument();
    expect(queryByTestId('severityHostAlertsTable')).toHaveClass('euiBasicTable-loading');
    expect(queryByTestId('hostTablePaginator')).not.toBeInTheDocument();
  });

  it('should render the updated at subtitle', () => {
    mockUseHostAlertsItemsReturn({ isLoading: false });
    const { getByText } = renderComponent();

    expect(getByText(/Updated/)).toBeInTheDocument();
  });

  it('should render the table columns', () => {
    mockUseHostAlertsItemsReturn({ items: parsedVulnerableHostsAlertsResult });
    const { getAllByRole } = renderComponent();

    const columnHeaders = getAllByRole('columnheader');
    expect(columnHeaders.at(0)).toHaveTextContent('Host name');
    expect(columnHeaders.at(1)).toHaveTextContent('Alerts');
    expect(columnHeaders.at(2)).toHaveTextContent('Critical');
    expect(columnHeaders.at(3)).toHaveTextContent('High');
    expect(columnHeaders.at(4)).toHaveTextContent('Medium');
    expect(columnHeaders.at(5)).toHaveTextContent('Low');
  });

  it('should render the table items', () => {
    mockUseHostAlertsItemsReturn({ items: [parsedVulnerableHostsAlertsResult[0]] });
    const { queryByTestId } = renderComponent();

    expect(queryByTestId('hostSeverityAlertsTable-hostName')).toHaveTextContent('Host-342m5gl1g2');
    expect(queryByTestId('hostSeverityAlertsTable-totalAlerts')).toHaveTextContent('100');
    expect(queryByTestId('hostSeverityAlertsTable-critical')).toHaveTextContent('5');
    expect(queryByTestId('hostSeverityAlertsTable-high')).toHaveTextContent('50');
    expect(queryByTestId('hostSeverityAlertsTable-medium')).toHaveTextContent('5');
    expect(queryByTestId('hostSeverityAlertsTable-low')).toHaveTextContent('40');
    expect(queryByTestId('hostTablePaginator')).not.toBeInTheDocument();
  });

  it('should render the paginator if more than 4 results', () => {
    const mockSetPage = jest.fn();

    mockUseHostAlertsItemsReturn({
      pagination: {
        currentPage: 1,
        pageCount: 3,
        setPage: mockSetPage,
      },
    });
    const { queryByTestId, getByText } = renderComponent();
    const page3 = getByText('3');
    expect(queryByTestId('hostTablePaginator')).toBeInTheDocument();

    fireEvent.click(page3);
    expect(mockSetPage).toHaveBeenCalledWith(2);
  });

  it('should open timeline with filters when total alerts is clicked', () => {
    mockUseHostAlertsItemsReturn({ items: [parsedVulnerableHostsAlertsResult[0]] });
    const { getByTestId } = renderComponent();

    fireEvent.click(getByTestId('hostSeverityAlertsTable-totalAlertsLink'));

    expect(mockOpenTimelineWithFilters).toHaveBeenCalledWith([
      [
        {
          field: 'host.name',
          value: 'Host-342m5gl1g2',
        },
        openAlertsFilter,
      ],
    ]);
  });

  it('should open timeline with filters when critical alert count is clicked', () => {
    mockUseHostAlertsItemsReturn({ items: [parsedVulnerableHostsAlertsResult[0]] });
    const { getByTestId } = renderComponent();

    fireEvent.click(getByTestId('hostSeverityAlertsTable-criticalLink'));

    expect(mockOpenTimelineWithFilters).toHaveBeenCalledWith([
      [
        {
          field: 'host.name',
          value: 'Host-342m5gl1g2',
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
