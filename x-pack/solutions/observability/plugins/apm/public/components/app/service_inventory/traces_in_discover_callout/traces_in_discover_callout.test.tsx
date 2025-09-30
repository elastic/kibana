/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';
import { TracesInDiscoverCallout } from '.';

const mockGetRedirectUrl = jest.fn(() => 'mock-discover-url');
const mockTraceIndex = 'apm-span, apm-transaction';

let mockGetActiveSpace = {
  solution: 'oblt',
};
let mockQuery = {
  environment: 'production',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
};
jest.mock('../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    share: {
      url: {
        locators: {
          get: jest.fn(() => ({ getRedirectUrl: mockGetRedirectUrl })),
        },
      },
    },
  }),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useKibanaSpace: () => ({
    space: mockGetActiveSpace,
  }),
  useFetcher: () => ({
    data: { span: 'apm-span', transaction: 'apm-transaction' },
    status: 'success',
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: mockQuery,
  }),
}));

const mockSetDismissedCallout = jest.fn();
let mockDismissedCallout = false;

jest.mock('../../../../hooks/use_local_storage', () => ({
  useLocalStorage: () => [mockDismissedCallout, mockSetDismissedCallout],
}));

describe('TracesInDiscoverCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDismissedCallout = false; // reset default
  });

  it('renders the callout with title, content and button', async () => {
    await act(async () => {
      render(<TracesInDiscoverCallout />);
    });

    expect(
      await screen.findByText('Try the new traces experience in Discover')
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Now you can view and analyse the full-screen waterfall and explore your trace data in context.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('apmServiceInventoryTracesInDiscoverCalloutButton')
    ).toBeInTheDocument();
  });

  it('dismisses the callout when clicking close', async () => {
    await act(async () => {
      render(<TracesInDiscoverCallout />);
    });
    const closeButton = await screen.findByTestId('euiDismissCalloutButton');
    fireEvent.click(closeButton);

    expect(mockSetDismissedCallout).toHaveBeenCalledWith(true);
  });

  it('does not render if dismissed', async () => {
    mockDismissedCallout = true;
    await act(async () => {
      render(<TracesInDiscoverCallout />);
    });

    expect(
      screen.queryByTestId('apmServiceInventoryTracesInDiscoverCallout')
    ).not.toBeInTheDocument();
  });

  it('does not render if solutionId is not oblt', async () => {
    mockGetActiveSpace = { solution: 'other' };
    render(<TracesInDiscoverCallout />);

    await waitFor(() => {
      expect(
        screen.queryByTestId('apmServiceInventoryTracesInDiscoverCalloutButton')
      ).not.toBeInTheDocument();
    });
  });

  it('calls getRedirectUrl with correct ES|QL for defined environment', async () => {
    await act(async () => {
      render(<TracesInDiscoverCallout />);
    });

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM ${mockTraceIndex}\n  | WHERE service.environment == "${mockQuery.environment}"`,
      },
      timeRange: {
        from: mockQuery.rangeFrom,
        to: mockQuery.rangeTo,
      },
    });
  });

  it('calls getRedirectUrl with correct ES|QL for ENVIRONMENT_ALL_VALUE', async () => {
    mockQuery = {
      ...mockQuery,
      environment: ENVIRONMENT_ALL_VALUE,
    };

    await act(async () => {
      render(<TracesInDiscoverCallout />);
    });

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM ${mockTraceIndex}`,
      },
      timeRange: {
        from: mockQuery.rangeFrom,
        to: mockQuery.rangeTo,
      },
    });
  });

  it('calls getRedirectUrl with correct ES|QL for ENVIRONMENT_NOT_DEFINED_VALUE', async () => {
    mockQuery = {
      ...mockQuery,
      environment: ENVIRONMENT_NOT_DEFINED_VALUE,
    };

    await act(async () => {
      render(<TracesInDiscoverCallout />);
    });

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM ${mockTraceIndex}\n  | WHERE service.environment IS NULL`,
      },
      timeRange: {
        from: mockQuery.rangeFrom,
        to: mockQuery.rangeTo,
      },
    });
  });
});
