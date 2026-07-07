/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TraceWaterfallFlyoutFooter } from './flyout_footer';

const mockGetRedirectUrl = jest.fn();

jest.mock('../../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    share: {
      url: {
        locators: {
          get: () => ({ getRedirectUrl: mockGetRedirectUrl }),
        },
      },
    },
  }),
}));

jest.mock('../../../../shared/links/discover_links/use_discover_href', () => ({
  useDiscoverHref: jest.fn(),
}));

import { useDiscoverHref } from '../../../../shared/links/discover_links/use_discover_href';

const defaultProps = {
  traceId: 'abc123',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
};

describe('TraceWaterfallFlyoutFooter', () => {
  beforeEach(() => {
    (useDiscoverHref as jest.Mock).mockReturnValue('https://discover-url');
    mockGetRedirectUrl.mockReturnValue('https://apm-url');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Open button', () => {
    render(<TraceWaterfallFlyoutFooter {...defaultProps} />);
    expect(screen.getByTestId('apmTraceWaterfallFlyoutActionsButton')).toBeInTheDocument();
  });

  it('opens the popover when the button is clicked', async () => {
    render(<TraceWaterfallFlyoutFooter {...defaultProps} />);

    await userEvent.click(screen.getByTestId('apmTraceWaterfallFlyoutActionsButton'));

    expect(screen.getByTestId('apmTraceWaterfallOpenInDiscover')).toBeInTheDocument();
    expect(screen.getByTestId('apmTraceWaterfallOpenInApm')).toBeInTheDocument();
  });

  it('renders "In Discover" with the correct href', async () => {
    render(<TraceWaterfallFlyoutFooter {...defaultProps} />);

    await userEvent.click(screen.getByTestId('apmTraceWaterfallFlyoutActionsButton'));

    expect(screen.getByTestId('apmTraceWaterfallOpenInDiscover')).toHaveAttribute(
      'href',
      'https://discover-url'
    );
  });

  it('renders "In APM" with the correct href', async () => {
    render(<TraceWaterfallFlyoutFooter {...defaultProps} />);

    await userEvent.click(screen.getByTestId('apmTraceWaterfallFlyoutActionsButton'));

    expect(screen.getByTestId('apmTraceWaterfallOpenInApm')).toHaveAttribute(
      'href',
      'https://apm-url'
    );
  });

  it('does not render "In Discover" when discoverHref is undefined', async () => {
    (useDiscoverHref as jest.Mock).mockReturnValue(undefined);

    render(<TraceWaterfallFlyoutFooter {...defaultProps} />);

    await userEvent.click(screen.getByTestId('apmTraceWaterfallFlyoutActionsButton'));

    expect(screen.queryByTestId('apmTraceWaterfallOpenInDiscover')).not.toBeInTheDocument();
  });

  it('does not render "In APM" when apmHref is undefined', async () => {
    mockGetRedirectUrl.mockReturnValue(undefined);

    render(<TraceWaterfallFlyoutFooter {...defaultProps} />);

    await userEvent.click(screen.getByTestId('apmTraceWaterfallFlyoutActionsButton'));

    expect(screen.queryByTestId('apmTraceWaterfallOpenInApm')).not.toBeInTheDocument();
  });

  it('does not render the footer when both hrefs are undefined', () => {
    (useDiscoverHref as jest.Mock).mockReturnValue(undefined);
    mockGetRedirectUrl.mockReturnValue(undefined);

    render(<TraceWaterfallFlyoutFooter {...defaultProps} />);

    expect(screen.queryByTestId('apmTraceWaterfallFlyoutActionsButton')).not.toBeInTheDocument();
  });

  it('passes traceId, rangeFrom and rangeTo to the APM locator', () => {
    render(<TraceWaterfallFlyoutFooter {...defaultProps} />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      traceId: 'abc123',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    });
  });
});
