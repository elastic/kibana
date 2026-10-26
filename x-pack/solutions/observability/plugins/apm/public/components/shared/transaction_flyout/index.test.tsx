/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { TransactionFlyout } from '.';

jest.mock('../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: { rangeFrom: 'now-15m', rangeTo: 'now', environment: 'ENVIRONMENT_ALL' },
  }),
}));

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({ link: () => '/mock-link' }),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      docLinks: { links: { apm: { droppedTransactionSpans: '/dropped-spans-docs' } } },
      analytics: { reportEvent: jest.fn() },
    },
  }),
}));

jest.mock('../genai_tab/use_genai_data', () => ({
  useGenAiData: () => ({
    metadata: {},
    isMetadataLoading: false,
    isGenAiSpan: false,
    genAi: undefined,
  }),
}));

jest.mock('../metadata_table/transaction_metadata', () => ({
  TransactionMetadata: ({ transaction }: { transaction: Transaction }) => (
    <div data-test-subj="mockTransactionMetadata">{transaction.transaction.id}</div>
  ),
}));

jest.mock('../span_links', () => ({
  ...jest.requireActual('../span_links'),
  SpanLinks: () => <div data-test-subj="mockSpanLinks" />,
}));

jest.mock('./footer/use_transaction_flyout_footer_menu', () => ({
  useTransactionFlyoutFooterMenu: () => ({
    panels: [{ id: 0, items: [{ name: 'Trace logs', href: '/logs' }] }],
    isLoading: false,
    hasActions: true,
    customLinkFlyout: null,
  }),
}));

const mockUseFetcher = useFetcher as jest.MockedFunction<typeof useFetcher>;

const buildTransaction = (id: string, name: string, dropped = 0) =>
  ({
    '@timestamp': '2024-01-01T00:00:00.000Z',
    timestamp: { us: 1704067200000000 },
    processor: { name: 'transaction', event: 'transaction' },
    trace: { id: 'trace-1' },
    service: { name: 'my-service' },
    agent: { name: 'nodejs' },
    transaction: {
      id,
      name,
      type: 'request',
      duration: { us: 5000 },
      span_count: { dropped },
    },
  } as unknown as Transaction);

const setFetch = (data: Transaction | undefined, status: FETCH_STATUS) =>
  mockUseFetcher.mockReturnValue({ data, status, refetch: jest.fn() } as unknown as ReturnType<
    typeof useFetcher
  >);

// Passed as `wrapper` so that `rerender` keeps the flyout mounted.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

const renderFlyout = (props: Partial<React.ComponentProps<typeof TransactionFlyout>> = {}) =>
  render(
    <TransactionFlyout
      transactionId="tx-1"
      traceId="trace-1"
      onClose={jest.fn()}
      spanLinksCount={{ linkedChildren: 2, linkedParents: 0 }}
      start="2024-01-01T00:00:00.000Z"
      end="2024-01-01T01:00:00.000Z"
      {...props}
    />,
    { wrapper }
  );

describe('TransactionFlyout', () => {
  it('shows the generic title and a skeleton while the transaction loads', () => {
    setFetch(undefined, FETCH_STATUS.LOADING);

    renderFlyout();

    expect(screen.getByTestId('transactionFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transaction details' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('transactionFlyoutTabs')).not.toBeInTheDocument();
  });

  it('shows an empty body without a skeleton when the transaction fails to load', () => {
    setFetch(undefined, FETCH_STATUS.FAILURE);

    renderFlyout();

    expect(screen.getByRole('heading', { name: 'Transaction details' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('transactionFlyoutTabs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockTransactionMetadata')).not.toBeInTheDocument();
  });

  it('shows the transaction header, tabs, and the dropped spans callout once loaded', () => {
    setFetch(buildTransaction('tx-1', 'GET /api', 3), FETCH_STATUS.SUCCESS);

    renderFlyout();

    expect(screen.getByRole('heading', { name: 'Transaction details' })).toBeInTheDocument();
    expect(screen.getByTestId('transactionFlyoutInfo-name')).toHaveTextContent('GET /api');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    expect(screen.getByTestId('transactionFlyoutTab-metadata')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('spanLinksTab')).toBeInTheDocument();
    expect(screen.getByTestId('mockTransactionMetadata')).toHaveTextContent('tx-1');

    expect(screen.getByTestId('transactionFlyoutDroppedSpansCallout')).toBeInTheDocument();
    expect(screen.getByTestId('transactionFlyoutActionsButton')).toBeEnabled();
  });

  it('selects the tab named by flyoutDetailTab', () => {
    setFetch(buildTransaction('tx-1', 'GET /api'), FETCH_STATUS.SUCCESS);

    renderFlyout({ flyoutDetailTab: 'span_links' });

    expect(screen.getByTestId('spanLinksTab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mockSpanLinks')).toBeInTheDocument();
    expect(screen.queryByTestId('transactionFlyoutDroppedSpansCallout')).not.toBeInTheDocument();
  });

  it('does not show the previous transaction while the next one loads', () => {
    setFetch(buildTransaction('tx-1', 'GET /api'), FETCH_STATUS.SUCCESS);
    const { rerender } = renderFlyout();
    expect(screen.getByTestId('transactionFlyoutInfo-name')).toHaveTextContent('GET /api');

    // The fetcher preserves the previous document while the next request is pending.
    setFetch(buildTransaction('tx-1', 'GET /api'), FETCH_STATUS.LOADING);
    rerender(
      <TransactionFlyout
        transactionId="tx-2"
        traceId="trace-1"
        onClose={jest.fn()}
        spanLinksCount={{ linkedChildren: 2, linkedParents: 0 }}
        start="2024-01-01T00:00:00.000Z"
        end="2024-01-01T01:00:00.000Z"
      />
    );

    expect(screen.queryByTestId('transactionFlyoutInfo-name')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transaction details' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('mockTransactionMetadata')).not.toBeInTheDocument();
  });
});
