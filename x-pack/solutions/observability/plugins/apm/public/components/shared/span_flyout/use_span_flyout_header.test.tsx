/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { Span } from '../../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import type { SpanFlyoutHeaderParts } from './use_span_flyout_header';
import { useSpanFlyoutHeader } from './use_span_flyout_header';

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

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  METRIC_TYPE: { CLICK: 'click' },
  useUiTracker: () => jest.fn(),
}));

const baseSpan = {
  '@timestamp': '2024-01-01T00:00:00.000Z',
  timestamp: { us: 1704067200000000 },
  processor: { name: 'transaction', event: 'span' },
  trace: { id: 'trace-1' },
  service: { name: 'my-service' },
  agent: { name: 'nodejs' },
  span: {
    id: 'span-1',
    name: 'SELECT *',
    type: 'db',
    duration: { us: 1000 },
  },
} as unknown as Span;

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

const renderHeader = (span: Span | undefined, parentTransaction?: Transaction) =>
  renderHook(() => useSpanFlyoutHeader({ span, parentTransaction, totalDuration: 5000 }), {
    wrapper,
  }).result.current;

/** Renders the title and the meta block and badge contents, which the template would place. */
const renderParts = ({ title, metaBlocks, badges }: SpanFlyoutHeaderParts) =>
  render(
    <>
      <h3>{title}</h3>
      {[...metaBlocks, ...badges].map((part) => (
        <div key={part.key} data-test-subj={part.props['data-test-subj']}>
          {part.props.children}
        </div>
      ))}
    </>,
    { wrapper }
  );

const getTestSubjects = (parts: React.ReactElement[]) =>
  parts.map((part) => part.props['data-test-subj']);

describe('useSpanFlyoutHeader', () => {
  it('renders span name from complete data', () => {
    const parts = renderHeader(baseSpan, baseTransaction);

    expect(parts.title).toBe('SELECT *');
    expect(parts.titleText).toBe('SELECT *');
    expect(parts.description).toBe('Span details');

    renderParts(parts);
    expect(screen.getByRole('heading', { name: 'SELECT *' })).toBeInTheDocument();
  });

  it('renders N/A when span.span is missing', () => {
    const spanWithoutInner = {
      ...baseSpan,
      span: undefined,
    } as unknown as Span;

    const parts = renderHeader(spanWithoutInner);

    expect(parts.title).toBe('N/A');
    expect(getTestSubjects(parts.metaBlocks)).toEqual(['spanFlyoutMeta-timestamp']);
    expect(parts.badges).toEqual([]);
  });

  it('does not crash when transaction.agent is missing', () => {
    const txWithoutAgent = {
      ...baseTransaction,
      agent: undefined,
    } as unknown as Transaction;

    renderParts(renderHeader(baseSpan, txWithoutAgent));

    expect(screen.getByRole('heading', { name: 'SELECT *' })).toBeInTheDocument();
    expect(screen.getByTestId('spanFlyoutMeta-service')).toHaveTextContent('my-service');
  });

  it('renders N/A for service when transaction.service is missing, and transaction name as plain text', () => {
    const txWithoutService = {
      ...baseTransaction,
      service: undefined,
    } as unknown as Transaction;

    renderParts(renderHeader(baseSpan, txWithoutService));

    expect(screen.getByRole('heading', { name: 'SELECT *' })).toBeInTheDocument();
    expect(screen.getByTestId('spanFlyoutMeta-service')).toHaveTextContent('N/A');
    expect(screen.getByTestId('spanFlyoutMeta-transaction')).toHaveTextContent('GET /api');
    expect(screen.queryByRole('link', { name: 'GET /api' })).not.toBeInTheDocument();
  });

  it('renders N/A for transaction name when transaction sub-object is missing', () => {
    const txWithoutInner = {
      ...baseTransaction,
      transaction: undefined,
    } as unknown as Transaction;

    renderParts(renderHeader(baseSpan, txWithoutInner));

    expect(screen.getByRole('heading', { name: 'SELECT *' })).toBeInTheDocument();
    expect(screen.getByTestId('spanFlyoutMeta-service')).toHaveTextContent('my-service');
    expect(screen.getByTestId('spanFlyoutMeta-transaction')).toHaveTextContent('N/A');
  });

  it('renders without transaction', () => {
    const parts = renderHeader(baseSpan);

    expect(getTestSubjects(parts.metaBlocks)).toEqual([
      'spanFlyoutMeta-timestamp',
      'spanFlyoutMeta-duration',
    ]);

    renderParts(parts);
    expect(screen.getByRole('heading', { name: 'SELECT *' })).toBeInTheDocument();
  });

  it('renders the generic title while the span is loading', () => {
    const parts = renderHeader(undefined);

    expect(parts.title).toBe('Span details');
    expect(parts.description).toBeUndefined();
    expect(parts.metaBlocks).toEqual([]);
    expect(parts.badges).toEqual([]);
  });

  it('renders the dependency block and every badge for a failed, blocking DB span', () => {
    const span = {
      ...baseSpan,
      event: { outcome: 'failure' },
      span: {
        ...baseSpan.span,
        subtype: 'mysql',
        action: 'query',
        sync: true,
        destination: { service: { resource: 'mysql' } },
      },
    } as unknown as Span;

    const parts = renderHeader(span, baseTransaction);

    expect(getTestSubjects(parts.metaBlocks)[0]).toBe('spanFlyoutMeta-dependency');
    expect(getTestSubjects(parts.badges)).toEqual([
      'spanFlyoutBadge-type',
      'spanFlyoutBadge-subtype',
      'spanFlyoutBadge-action',
      'spanFlyoutBadge-failure',
      'spanFlyoutBadge-sync',
    ]);
    expect(parts.badges.map((badge) => badge.props.children)).toEqual([
      'DB',
      'MySQL',
      'query',
      'failure',
      'blocking',
    ]);
    expect(parts.badges[0].props).toEqual(
      expect.objectContaining({ color: 'hollow', toolTipContent: 'Type' })
    );
  });
});
