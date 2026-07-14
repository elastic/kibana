/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RedirectWithDefaultDateRange } from '.';

const mockRedirect = jest.fn();
const mockIsDateRangeSet = jest.fn();

jest.mock('../../../../hooks/use_date_range_redirect', () => ({
  useDateRangeRedirect: () => ({
    isDateRangeSet: mockIsDateRangeSet(),
    redirect: mockRedirect,
  }),
}));

jest.mock('../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({}),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ pathname: '/services', search: '', hash: '', state: undefined }),
}));

const mockIsRouteWithTimeRange = jest.fn();

jest.mock('../../../shared/is_route_with_time_range', () => ({
  isRouteWithTimeRange: (...args: unknown[]) => mockIsRouteWithTimeRange(...args),
}));

const renderComponent = () =>
  render(
    <RedirectWithDefaultDateRange>
      <div>child content</div>
    </RedirectWithDefaultDateRange>
  );

describe('RedirectWithDefaultDateRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRouteWithTimeRange.mockReturnValue(true);
  });

  it('renders children when isDateRangeSet is true', () => {
    mockIsDateRangeSet.mockReturnValue(true);

    renderComponent();

    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('calls redirect and does not render children when isDateRangeSet is false', () => {
    mockIsDateRangeSet.mockReturnValue(false);

    renderComponent();

    expect(screen.queryByText('child content')).not.toBeInTheDocument();
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it('renders children without redirecting when isRouteWithTimeRange returns false', () => {
    mockIsDateRangeSet.mockReturnValue(false);
    mockIsRouteWithTimeRange.mockReturnValue(false);

    renderComponent();

    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
