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
import { parsedVulnerableUserAlertsResult } from './mock_data';
import { UseUserAlertsItems } from './use_user_alerts_items';
import { UserAlertsTable } from './user_alerts_table';

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

type UseUserAlertsItemsReturn = ReturnType<UseUserAlertsItems>;
const defaultUseUserAlertsItemsReturn: UseUserAlertsItemsReturn = {
  items: [],
  isLoading: false,
  updatedAt: Date.now(),
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
    const { getByText, getByTestId } = renderComponent();

    expect(getByTestId('severityUserAlertsPanel')).toBeInTheDocument();
    expect(getByText('No alerts to display')).toBeInTheDocument();
    expect(getByTestId('severityUserAlertsButton')).toBeInTheDocument();
  });

  it('should render a loading table', () => {
    mockUseUserAlertsItemsReturn({ isLoading: true });
    const { getByText, getByTestId } = renderComponent();

    expect(getByText('Updating...')).toBeInTheDocument();
    expect(getByTestId('severityUserAlertsButton')).toBeInTheDocument();
    expect(getByTestId('severityUserAlertsTable')).toHaveClass('euiBasicTable-loading');
  });

  it('should render the updated at subtitle', () => {
    mockUseUserAlertsItemsReturn({ isLoading: false });
    const { getByText } = renderComponent();

    expect(getByText('Updated now')).toBeInTheDocument();
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
    const { getByTestId } = renderComponent();

    expect(getByTestId('userSeverityAlertsTable-critical')).toHaveTextContent('4');
    expect(getByTestId('userSeverityAlertsTable-totalAlerts')).toHaveTextContent('4');
    expect(getByTestId('userSeverityAlertsTable-high')).toHaveTextContent('1');
    expect(getByTestId('userSeverityAlertsTable-medium')).toHaveTextContent('1');
    expect(getByTestId('userSeverityAlertsTable-low')).toHaveTextContent('1');
  });
});
