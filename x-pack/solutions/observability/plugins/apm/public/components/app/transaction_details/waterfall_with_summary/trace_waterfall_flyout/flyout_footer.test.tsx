/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import { TraceWaterfallFlyoutFooter } from './flyout_footer';

const mockGetRedirectUrl = jest.fn();
const mockShare = {
  url: {
    locators: {
      get: () => ({ getRedirectUrl: mockGetRedirectUrl }),
    },
  },
};
const mockHttp = {} as any;

const FETCHED_INDICES = { transaction: 'traces-*' } as APMIndices;

const mockUseResolvedApmIndices = jest.fn(
  (_args: unknown): APMIndices | null | undefined => FETCHED_INDICES
);

jest.mock('../../../../../hooks/use_apm_indices', () => ({
  useResolvedApmIndices: (args: unknown) => mockUseResolvedApmIndices(args),
}));

jest.mock('../../../../shared/service_flyout/utils/get_flyout_discover_navigation', () => ({
  getFlyoutDiscoverNavigation: jest.fn(),
}));

import { getFlyoutDiscoverNavigation } from '../../../../shared/service_flyout/utils/get_flyout_discover_navigation';

const defaultProps = {
  traceId: 'abc123',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  share: mockShare as any,
  http: mockHttp,
};

describe('TraceWaterfallFlyoutFooter', () => {
  beforeEach(() => {
    mockUseResolvedApmIndices.mockReturnValue(FETCHED_INDICES);
    (getFlyoutDiscoverNavigation as jest.Mock).mockReturnValue({
      href: 'https://discover-url',
      esqlQuery: 'FROM traces',
    });
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
    (getFlyoutDiscoverNavigation as jest.Mock).mockReturnValue({
      href: undefined,
      esqlQuery: null,
    });

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
    (getFlyoutDiscoverNavigation as jest.Mock).mockReturnValue({
      href: undefined,
      esqlQuery: null,
    });
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

  it('fetches indices when no parent source is provided', () => {
    render(<TraceWaterfallFlyoutFooter {...defaultProps} />);

    expect(mockUseResolvedApmIndices).toHaveBeenCalledWith({
      http: mockHttp,
      indicesSource: undefined,
    });
    expect(getFlyoutDiscoverNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ indices: FETCHED_INDICES })
    );
  });

  it('uses parent indices for the Discover link', () => {
    const parentIndices = { transaction: 'traces-parent*' } as APMIndices;
    mockUseResolvedApmIndices.mockReturnValue(parentIndices);

    render(
      <TraceWaterfallFlyoutFooter {...defaultProps} indicesSource={{ indices: parentIndices }} />
    );

    expect(mockUseResolvedApmIndices).toHaveBeenCalledWith({
      http: mockHttp,
      indicesSource: { indices: parentIndices },
    });
    expect(getFlyoutDiscoverNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ indices: parentIndices })
    );
  });
});
