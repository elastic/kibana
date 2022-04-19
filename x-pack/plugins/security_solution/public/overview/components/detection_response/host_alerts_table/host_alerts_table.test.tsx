/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';

import { SecurityPageName } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock';
import { parsedVulnerableHostsAlertsResult } from './mock_data';
import { UseHostAlertsItems } from './use_host_alerts_items';
import { HostAlertsTable } from './host_alerts_table';

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

type UseHostAlertsItemsReturn = ReturnType<UseHostAlertsItems>;
const defaultUseHostAlertsItemsReturn: UseHostAlertsItemsReturn = {
  items: [],
  isLoading: false,
  updatedAt: Date.now(),
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
    const { getByText, getByTestId } = renderComponent();

    expect(getByTestId('severityHostAlertsPanel')).toBeInTheDocument();
    expect(getByText('No alerts to display')).toBeInTheDocument();
    expect(getByTestId('severityHostAlertsButton')).toBeInTheDocument();
  });

  it('should render a loading table', () => {
    mockUseHostAlertsItemsReturn({ isLoading: true });
    const { getByText, getByTestId } = renderComponent();

    expect(getByText('Updating...')).toBeInTheDocument();
    expect(getByTestId('severityHostAlertsButton')).toBeInTheDocument();
    expect(getByTestId('severityHostAlertsTable')).toHaveClass('euiBasicTable-loading');
  });

  it('should render the updated at subtitle', () => {
    mockUseHostAlertsItemsReturn({ isLoading: false });
    const { getByText } = renderComponent();

    expect(getByText('Updated now')).toBeInTheDocument();
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
    const { getByTestId } = renderComponent();

    expect(getByTestId('hostSeverityAlertsTable-totalAlerts')).toHaveTextContent('100');
    expect(getByTestId('hostSeverityAlertsTable-critical')).toHaveTextContent('5');
    expect(getByTestId('hostSeverityAlertsTable-high')).toHaveTextContent('50');
    expect(getByTestId('hostSeverityAlertsTable-medium')).toHaveTextContent('5');
    expect(getByTestId('hostSeverityAlertsTable-low')).toHaveTextContent('40');
  });
});
