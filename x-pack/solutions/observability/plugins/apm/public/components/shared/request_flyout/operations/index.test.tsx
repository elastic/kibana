/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderInRequestFlyout } from '../test_utils';
import { RequestFlyoutOperations } from '.';

const mockUseRequestFlyoutOperations = jest.fn();
jest.mock('./use_request_flyout_operations', () => ({
  useRequestFlyoutOperations: () => mockUseRequestFlyoutOperations(),
}));

const mockGetDiscoverHref = jest.fn();
jest.mock('../use_discover_href_builder', () => ({
  useDiscoverHrefBuilder: () => mockGetDiscoverHref,
}));

const OPERATIONS = [
  {
    spanName: 'SELECT * FROM orders',
    spanType: 'db',
    latency: 12_000,
    throughput: 4,
    failureRate: 0.25,
    impact: 80,
  },
  {
    spanName: 'INSERT INTO orders',
    spanType: undefined,
    latency: null,
    throughput: 1,
    failureRate: null,
    impact: 20,
  },
];

describe('RequestFlyoutOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDiscoverHref.mockReturnValue('http://discover');
    mockUseRequestFlyoutOperations.mockReturnValue({
      items: OPERATIONS,
      dependencyName: 'postgresql',
      isLoading: false,
      hasError: false,
    });
  });

  it('renders a row per operation, with a dash for missing values', () => {
    renderInRequestFlyout(<RequestFlyoutOperations />);

    expect(screen.getAllByTestId('requestFlyoutOperationRow')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'SELECT * FROM orders' })).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('opens the operation as a child flyout and closes it on a second click', () => {
    renderInRequestFlyout(<RequestFlyoutOperations />);

    fireEvent.click(screen.getByRole('button', { name: 'SELECT * FROM orders' }));
    expect(screen.getByTestId('openChild')).toHaveTextContent('operation');

    fireEvent.click(screen.getByRole('button', { name: 'SELECT * FROM orders' }));
    expect(screen.queryByTestId('openChild')).not.toBeInTheDocument();
  });

  it('shows the names as plain text when the dependency is unknown', () => {
    mockUseRequestFlyoutOperations.mockReturnValue({
      items: OPERATIONS,
      dependencyName: undefined,
      isLoading: false,
      hasError: false,
    });
    renderInRequestFlyout(<RequestFlyoutOperations />);

    expect(screen.queryByRole('button', { name: 'SELECT * FROM orders' })).not.toBeInTheDocument();
    expect(screen.getByText('SELECT * FROM orders')).toBeInTheDocument();
  });

  it('shows an error message when the operations cannot be loaded', () => {
    mockUseRequestFlyoutOperations.mockReturnValue({
      items: [],
      dependencyName: 'postgresql',
      isLoading: false,
      hasError: true,
    });
    renderInRequestFlyout(<RequestFlyoutOperations />);

    expect(screen.getByText('Unable to load the operations of this connection.')).toBeVisible();
  });

  it('shows an empty message when there are no operations', () => {
    mockUseRequestFlyoutOperations.mockReturnValue({
      items: [],
      dependencyName: 'postgresql',
      isLoading: false,
      hasError: false,
    });
    renderInRequestFlyout(<RequestFlyoutOperations />);

    expect(screen.getByText('No operations found for this connection.')).toBeVisible();
  });
});
