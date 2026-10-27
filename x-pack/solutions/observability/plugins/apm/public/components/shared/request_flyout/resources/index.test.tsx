/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderInRequestFlyout } from '../test_utils';
import { RequestFlyoutResources } from '.';

const mockUseRequestFlyoutResources = jest.fn();
jest.mock('./use_request_flyout_resources', () => ({
  MAX_RESOURCES_SHOWN: 10,
  useRequestFlyoutResources: () => mockUseRequestFlyoutResources(),
}));

const ITEMS = [
  {
    resource: 'api.example.com:443',
    spanSubtype: 'http',
    latency: 20_000,
    throughput: 3,
    failureRate: 0.1,
    impact: 70,
  },
  {
    resource: 'cdn.example.com:443',
    spanSubtype: undefined,
    latency: null,
    throughput: null,
    failureRate: null,
    impact: 30,
  },
];

describe('RequestFlyoutResources', () => {
  beforeEach(() => {
    mockUseRequestFlyoutResources.mockReturnValue({
      items: ITEMS,
      totalResources: 2,
      isLoading: false,
      hasError: false,
    });
  });

  it('renders a row per resource', () => {
    renderInRequestFlyout(<RequestFlyoutResources />);

    expect(screen.getAllByTestId('requestFlyoutResourceRow')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'api.example.com:443' })).toBeInTheDocument();
  });

  it('opens the resource as a child flyout', () => {
    renderInRequestFlyout(<RequestFlyoutResources />);

    fireEvent.click(screen.getByRole('button', { name: 'api.example.com:443' }));

    expect(screen.getByTestId('openChild')).toHaveTextContent('resource');
  });

  it('only mentions the top N when more resources are grouped than shown', () => {
    const { unmount } = renderInRequestFlyout(<RequestFlyoutResources />);
    expect(screen.queryByTestId('requestFlyoutResourcesTopN')).not.toBeInTheDocument();
    unmount();

    mockUseRequestFlyoutResources.mockReturnValue({
      items: ITEMS,
      totalResources: 25,
      isLoading: false,
      hasError: false,
    });
    renderInRequestFlyout(<RequestFlyoutResources />);

    expect(screen.getByTestId('requestFlyoutResourcesTopN')).toHaveTextContent(
      'Top 2 of 25 resources'
    );
  });

  it('shows an error message when the resources cannot be loaded', () => {
    mockUseRequestFlyoutResources.mockReturnValue({
      items: [],
      totalResources: 2,
      isLoading: false,
      hasError: true,
    });
    renderInRequestFlyout(<RequestFlyoutResources />);

    expect(screen.getByText('Unable to load the resources of this connection.')).toBeVisible();
  });
});
