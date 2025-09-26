/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { TracesInDiscoverCallout } from './traces_in_discover_callout';

const mockGetRedirectUrl = jest.fn(() => 'mock-discover-url');
const mockGetApmIndices = jest.fn(() =>
  Promise.resolve({ span: 'apm-span', transaction: 'apm-transaction' })
);
const mockGetActiveSpace = jest.fn(() => Promise.resolve({ solution: 'oblt' }));

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

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      apmSourcesAccess: { getApmIndices: mockGetApmIndices },
      spaces: { getActiveSpace: mockGetActiveSpace },
    },
  }),
}));

jest.mock('../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: {
      environment: 'production',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    },
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
    expect(screen.getByTestId('apmApmMainTemplateViewTracesInDiscoverButton')).toBeInTheDocument();
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
      screen.queryByTestId('apmApmMainTemplateTracesInDiscoverCallout')
    ).not.toBeInTheDocument();
  });

  it('does not render if solutionId is not oblt', async () => {
    mockGetActiveSpace.mockResolvedValueOnce({ solution: 'other' });
    render(<TracesInDiscoverCallout />);

    await waitFor(() => {
      expect(
        screen.queryByTestId('apmApmMainTemplateViewTracesInDiscoverButton')
      ).not.toBeInTheDocument();
    });
  });
});
