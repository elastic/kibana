/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderInRequestFlyout } from '../test_utils';
import { RequestFlyoutFailedCalls } from '.';

const mockUseRequestFlyoutFailedCalls = jest.fn();
jest.mock('./use_request_flyout_failed_calls', () => ({
  useRequestFlyoutFailedCalls: () => mockUseRequestFlyoutFailedCalls(),
}));

jest.mock('../use_discover_href_builder', () => ({
  useDiscoverHrefBuilder: () => () => 'http://discover',
}));

jest.mock('../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({ link: (path: string) => `http://apm${path}` }),
}));

const BUCKETS = [
  {
    type: 'caller',
    count: 2,
    sampleTraceId: 'trace-1',
    topError: 'HTTP 504',
    topErrorGroupId: null,
  },
  {
    type: 'server',
    count: 8,
    sampleTraceId: 'trace-2',
    topError: 'NullPointerException',
    topErrorGroupId: 'group-1',
  },
];

const state = (overrides = {}) => ({
  buckets: BUCKETS,
  totalFailed: 10,
  totalCalls: 100,
  isSampled: false,
  isApplicable: true,
  isLoading: false,
  hasError: false,
  ...overrides,
});

describe('RequestFlyoutFailedCalls', () => {
  beforeEach(() => {
    mockUseRequestFlyoutFailedCalls.mockReturnValue(state());
  });

  it('sorts the buckets by failure rate, highest first', () => {
    renderInRequestFlyout(<RequestFlyoutFailedCalls />, {
      connection: {
        sourceServiceName: 'frontend',
        sourceLabel: 'frontend',
        targetLabel: 'backend',
        targetServiceName: 'backend',
        dependencies: ['backend:8080'],
      },
    });

    const rows = screen.getAllByTestId(/^requestFlyoutFailedCallsRow-/);
    expect(rows.map((row) => row.getAttribute('data-test-subj'))).toEqual([
      'requestFlyoutFailedCallsRow-server',
      'requestFlyoutFailedCallsRow-caller',
    ]);
  });

  it('opens the errors of a bucket with an APM error group, and shows other top errors as text', () => {
    renderInRequestFlyout(<RequestFlyoutFailedCalls />);

    expect(screen.getByText('HTTP 504')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'HTTP 504' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'NullPointerException' }));
    expect(screen.getByTestId('openChild')).toHaveTextContent('error');
  });

  it('links to all the errors of the source service when there are failures', () => {
    renderInRequestFlyout(<RequestFlyoutFailedCalls />);

    expect(screen.getByTestId('requestFlyoutSeeAllErrors')).toBeInTheDocument();
  });

  it('says there are no failed calls when nothing failed', () => {
    mockUseRequestFlyoutFailedCalls.mockReturnValue(
      state({ buckets: [], totalFailed: 0, totalCalls: 40 })
    );
    renderInRequestFlyout(<RequestFlyoutFailedCalls />);

    expect(screen.getByText('No failed calls in this time range.')).toBeVisible();
    expect(screen.queryByTestId('requestFlyoutSeeAllErrors')).not.toBeInTheDocument();
  });

  it('explains that failed calls are not available when the resources are unknown', () => {
    mockUseRequestFlyoutFailedCalls.mockReturnValue(
      state({ buckets: [], totalFailed: 0, isApplicable: false })
    );
    renderInRequestFlyout(<RequestFlyoutFailedCalls />);

    expect(screen.getByTestId('requestFlyoutFailedCallsNotAvailable')).toBeInTheDocument();
  });

  it('shows an error message when the failed calls cannot be loaded', () => {
    mockUseRequestFlyoutFailedCalls.mockReturnValue(
      state({ buckets: [], totalFailed: 0, hasError: true })
    );
    renderInRequestFlyout(<RequestFlyoutFailedCalls />);

    expect(screen.getByText('Unable to load the failed calls of this connection.')).toBeVisible();
  });

  it('warns when the failed calls are sampled', () => {
    mockUseRequestFlyoutFailedCalls.mockReturnValue(state({ isSampled: true }));
    renderInRequestFlyout(<RequestFlyoutFailedCalls />);

    expect(
      screen.getByText(
        'Not all failed calls are classified. The most recent failed calls are used.'
      )
    ).toBeVisible();
  });
});
