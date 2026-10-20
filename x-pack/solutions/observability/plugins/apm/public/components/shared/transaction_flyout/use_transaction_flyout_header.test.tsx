/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import type { TransactionFlyoutHeaderParts } from './use_transaction_flyout_header';
import { useTransactionFlyoutHeader } from './use_transaction_flyout_header';

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: {
      kuery: '',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: 'ENVIRONMENT_ALL',
      comparisonEnabled: false,
      offset: '1d',
    },
  }),
}));

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({
    link: jest.fn().mockReturnValue('/mock-link'),
  }),
}));

const baseTransaction = {
  '@timestamp': '2024-01-01T00:00:00.000Z',
  timestamp: { us: 1704067200000000 },
  processor: { name: 'transaction', event: 'transaction' },
  trace: { id: 'trace-1' },
  service: { name: 'my-service', environment: 'production' },
  agent: { name: 'nodejs' },
  transaction: {
    id: 'tx-1',
    name: 'GET /api',
    type: 'request',
    duration: { us: 5000 },
  },
} as unknown as Transaction;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>{children}</EuiThemeProvider>
);

const renderHeader = (
  transaction: Transaction | undefined,
  { errorCount = 0 }: { errorCount?: number } = {}
) =>
  renderHook(
    () => useTransactionFlyoutHeader({ transaction, errorCount, rootTransactionDuration: 10000 }),
    { wrapper }
  ).result.current;

/** Renders the meta block, info block, and badge contents, which the template would place. */
const renderParts = ({ metaBlocks, infoBlocks, badges }: TransactionFlyoutHeaderParts) =>
  render(
    <>
      {[...metaBlocks, ...infoBlocks, ...badges].map((part) => (
        <div key={part.key} data-test-subj={part.props['data-test-subj']}>
          {part.props.children}
        </div>
      ))}
    </>,
    { wrapper }
  );

const getTestSubjects = (parts: React.ReactElement[]) =>
  parts.map((part) => part.props['data-test-subj']);

describe('useTransactionFlyoutHeader', () => {
  it('renders null when transaction is undefined', () => {
    const parts = renderHeader(undefined);

    expect(parts.metaBlocks).toEqual([]);
    expect(parts.infoBlocks).toEqual([]);
    expect(parts.badges).toEqual([]);
  });

  it('renders service and transaction links with complete data', () => {
    const parts = renderHeader(baseTransaction);

    expect(getTestSubjects(parts.metaBlocks)).toEqual(['transactionFlyoutInfo-name']);
    expect(parts.metaBlocks[0].props.title).toBe('Transaction');
    expect(getTestSubjects(parts.infoBlocks)).toEqual([
      'transactionFlyoutInfo-service',
      'transactionFlyoutInfo-timestamp',
      'transactionFlyoutInfo-duration',
    ]);
    expect(parts.infoBlocks.map((block) => block.props.title)).toEqual([
      'Service',
      'Date',
      'Duration',
    ]);

    renderParts(parts);

    expect(screen.getByTestId('transactionFlyoutInfo-name')).toHaveTextContent('GET /api');
    expect(screen.getByRole('link', { name: 'GET /api' })).toHaveAttribute('href', '/mock-link');
    expect(screen.getByTestId('transactionFlyoutInfo-service')).toHaveTextContent('my-service');
  });

  it('does not crash when agent is missing', () => {
    const txWithoutAgent = {
      ...baseTransaction,
      agent: undefined,
    } as unknown as Transaction;

    renderParts(renderHeader(txWithoutAgent));

    expect(screen.getByTestId('transactionFlyoutInfo-service')).toHaveTextContent('my-service');
    expect(screen.getByRole('link', { name: 'GET /api' })).toBeInTheDocument();
  });

  it('renders N/A for service when service is missing, and transaction name as plain text', () => {
    const txWithoutService = {
      ...baseTransaction,
      service: undefined,
    } as unknown as Transaction;

    renderParts(renderHeader(txWithoutService));

    expect(screen.getByTestId('transactionFlyoutInfo-service')).toHaveTextContent('N/A');
    expect(screen.getByTestId('transactionFlyoutInfo-name')).toHaveTextContent('GET /api');
    expect(screen.queryByRole('link', { name: 'GET /api' })).not.toBeInTheDocument();
  });

  it('renders N/A for transaction when transaction sub-object is missing', () => {
    const txWithoutInner = {
      ...baseTransaction,
      transaction: undefined,
    } as unknown as Transaction;

    renderParts(renderHeader(txWithoutInner));

    expect(screen.getByTestId('transactionFlyoutInfo-name')).toHaveTextContent('N/A');
    expect(screen.getByTestId('transactionFlyoutInfo-service')).toHaveTextContent('my-service');
    expect(screen.queryByTestId('transactionFlyoutInfo-duration')).not.toBeInTheDocument();
  });

  it('shows the result badge without a URL, and the request block and error count otherwise', () => {
    const withResult = {
      ...baseTransaction,
      transaction: { ...baseTransaction.transaction, result: 'HTTP 2xx' },
    } as unknown as Transaction;

    const resultParts = renderHeader(withResult);
    expect(getTestSubjects(resultParts.badges)).toEqual(['transactionFlyoutBadge-result']);
    expect(resultParts.badges[0].props.toolTipContent).toBe('Result');
    expect(resultParts.badges[0].props.children).toBe('HTTP 2xx');

    const withUrlAndErrors = {
      ...withResult,
      url: { full: 'https://example.com/api' },
      faas: { coldstart: true },
    } as unknown as Transaction;

    const urlParts = renderHeader(withUrlAndErrors, { errorCount: 2 });
    expect(getTestSubjects(urlParts.metaBlocks)).toEqual([
      'transactionFlyoutInfo-name',
      'transactionFlyoutInfo-request',
    ]);
    expect(urlParts.metaBlocks[1].props.title).toBe('Request');
    expect(urlParts.metaBlocks[1].props.children.props.fitToContainer).toBe(true);
    expect(getTestSubjects(urlParts.badges)).toEqual([
      'transactionFlyoutBadge-errorCount',
      'transactionFlyoutBadge-coldStart',
    ]);
    expect(urlParts.badges[0].props.children).toBe('2 Errors');
  });
});
