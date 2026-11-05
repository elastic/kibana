/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Span } from '../../../../typings/es_schemas/ui/span';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useSpanFlyoutMenuProps } from './use_span_flyout_menu_props';
import { SpanFlyout } from '.';

jest.mock('../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));

jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2024-01-01T00:00:00.000Z', end: '2024-01-01T01:00:00.000Z' }),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: { rangeFrom: 'now-15m', rangeTo: 'now', environment: 'ENVIRONMENT_ALL' },
  }),
}));

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({ link: () => '/mock-link' }),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  METRIC_TYPE: { CLICK: 'click' },
  useUiTracker: () => jest.fn(),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({ core: { analytics: { reportEvent: jest.fn() } } }),
}));

jest.mock('../genai_tab/use_genai_data', () => ({
  useGenAiData: () => ({
    metadata: {},
    isMetadataLoading: false,
    isGenAiSpan: false,
    genAi: undefined,
  }),
}));

jest.mock('../metadata_table/span_metadata', () => ({
  SpanMetadata: ({ span }: { span: Span }) => (
    <div data-test-subj="mockSpanMetadata">{span.span.id}</div>
  ),
}));

jest.mock('../span_links', () => ({
  ...jest.requireActual('../span_links'),
  SpanLinks: () => <div data-test-subj="mockSpanLinks" />,
}));

jest.mock('./use_span_flyout_menu_props', () => ({
  useSpanFlyoutMenuProps: jest.fn().mockReturnValue(undefined),
}));

const mockUseFetcher = useFetcher as jest.MockedFunction<typeof useFetcher>;
const mockUseSpanFlyoutMenuProps = useSpanFlyoutMenuProps as jest.MockedFunction<
  typeof useSpanFlyoutMenuProps
>;

const buildSpan = (overrides: Record<string, unknown> = {}) =>
  ({
    '@timestamp': '2024-01-01T00:00:00.000Z',
    timestamp: { us: 1704067200000000 },
    processor: { name: 'transaction', event: 'span' },
    trace: { id: 'trace-1' },
    service: { name: 'my-service' },
    agent: { name: 'nodejs' },
    span: {
      id: 'span-1',
      name: 'SELECT * FROM orders',
      type: 'db',
      subtype: 'postgresql',
      duration: { us: 1000 },
      db: { statement: 'SELECT * FROM orders' },
      ...overrides,
    },
  } as unknown as Span);

const setFetch = (span: Span | undefined, status: FETCH_STATUS) =>
  mockUseFetcher.mockReturnValue({
    data: { span, parentTransaction: undefined },
    status,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useFetcher>);

// Passed as `wrapper` so that `rerender` keeps the flyout mounted.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

const renderFlyout = (props: Partial<React.ComponentProps<typeof SpanFlyout>> = {}) =>
  render(
    <SpanFlyout
      spanId="span-1"
      traceId="trace-1"
      onClose={jest.fn()}
      spanLinksCount={{ linkedChildren: 0, linkedParents: 1 }}
      rangeFrom="now-15m"
      rangeTo="now"
      {...props}
    />,
    { wrapper }
  );

const lastMenuPropsArgs = () =>
  mockUseSpanFlyoutMenuProps.mock.calls[mockUseSpanFlyoutMenuProps.mock.calls.length - 1][0];

describe('SpanFlyout', () => {
  beforeEach(() => {
    mockUseSpanFlyoutMenuProps.mockClear();
  });

  it('shows the generic title and a skeleton, without the Discover action, while the span loads', () => {
    setFetch(undefined, FETCH_STATUS.LOADING);

    renderFlyout();

    expect(screen.getByTestId('spanFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Span details' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(lastMenuPropsArgs()).toEqual(expect.objectContaining({ isSpanLoaded: false }));
  });

  it.each([
    ['fails to load', FETCH_STATUS.FAILURE],
    ['is not found', FETCH_STATUS.SUCCESS],
  ])('shows an empty body without a skeleton when the span %s', (_, status) => {
    setFetch(undefined, status);

    renderFlyout();

    expect(screen.getByRole('heading', { name: 'Span details' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spanFlyoutTabs')).not.toBeInTheDocument();
    expect(lastMenuPropsArgs()).toEqual(expect.objectContaining({ isSpanLoaded: false }));
  });

  it('shows the span header, the database statement section, and the Discover action', () => {
    setFetch(buildSpan(), FETCH_STATUS.SUCCESS);

    renderFlyout({ kuery: 'service.name: "a"' });

    expect(screen.getByRole('heading', { name: 'Span details' })).toBeInTheDocument();
    expect(screen.getByTestId('spanFlyoutInfo-name')).toHaveTextContent('SELECT * FROM orders');
    expect(screen.getByTestId('spanFlyoutTab-metadata')).toHaveAttribute('aria-selected', 'true');
    const section = screen.getByRole('region', { name: 'Database statement' });
    expect(section).toHaveAttribute('data-test-subj', 'spanFlyoutDatabaseSection');
    expect(section).toHaveTextContent('SELECT * FROM orders');
    expect(screen.getByTestId('mockSpanMetadata')).not.toContainElement(section);
    expect(screen.queryByTestId('spanFlyoutCompositeCallout')).not.toBeInTheDocument();

    expect(lastMenuPropsArgs()).toEqual({
      isSpanLoaded: true,
      spanId: 'span-1',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      kuery: 'service.name: "a"',
    });
  });

  it('shows the composite callout for a composite span', () => {
    setFetch(
      buildSpan({
        composite: { count: 4, sum: { us: 4000 }, compression_strategy: 'exact_match' },
      }),
      FETCH_STATUS.SUCCESS
    );

    renderFlyout();

    expect(screen.getByTestId('spanFlyoutCompositeCallout')).toHaveTextContent(
      'This is a sample document for a group of consecutive, similar spans'
    );
  });

  it('selects the tab named by flyoutDetailTab and keeps the database statement visible', () => {
    setFetch(buildSpan(), FETCH_STATUS.SUCCESS);

    renderFlyout({ flyoutDetailTab: 'span_links' });

    expect(screen.getByTestId('spanLinksTab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mockSpanLinks')).toBeInTheDocument();
    expect(screen.getByTestId('spanFlyoutDatabaseSection')).toHaveTextContent(
      'SELECT * FROM orders'
    );
    expect(screen.queryByTestId('mockSpanMetadata')).not.toBeInTheDocument();
  });

  it('keeps the same database statement section mounted when switching tabs', async () => {
    const user = userEvent.setup();
    setFetch(buildSpan(), FETCH_STATUS.SUCCESS);
    renderFlyout();

    const section = screen.getByTestId('spanFlyoutDatabaseSection');
    await user.click(screen.getByTestId('spanLinksTab'));

    expect(screen.getByTestId('mockSpanLinks')).toBeInTheDocument();
    expect(screen.getByTestId('spanFlyoutDatabaseSection')).toBe(section);
  });

  it('does not show the previous span while the next one loads', () => {
    setFetch(buildSpan(), FETCH_STATUS.SUCCESS);
    const { rerender } = renderFlyout();
    expect(screen.getByTestId('spanFlyoutInfo-name')).toHaveTextContent('SELECT * FROM orders');

    // The fetcher preserves the previous document while the next request is pending.
    setFetch(buildSpan(), FETCH_STATUS.LOADING);
    rerender(
      <SpanFlyout
        spanId="span-2"
        traceId="trace-1"
        onClose={jest.fn()}
        spanLinksCount={{ linkedChildren: 0, linkedParents: 1 }}
        rangeFrom="now-15m"
        rangeTo="now"
      />
    );

    expect(screen.queryByTestId('spanFlyoutInfo-name')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Span details' })).toBeInTheDocument();
    expect(screen.queryByTestId('spanFlyoutDatabaseSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockSpanMetadata')).not.toBeInTheDocument();
    expect(lastMenuPropsArgs()).toEqual(expect.objectContaining({ isSpanLoaded: false }));
  });
});
