/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { StickySpanProperties } from './sticky_span_properties';

jest.mock('../../../../../../../hooks/use_apm_params', () => ({
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

jest.mock('../../../../../../../hooks/use_apm_router', () => ({
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

const renderWithTheme = (ui: React.ReactElement) =>
  render(<EuiThemeProvider>{ui}</EuiThemeProvider>);

describe('StickySpanProperties', () => {
  it('renders span name from complete data', () => {
    renderWithTheme(<StickySpanProperties span={baseSpan} transaction={baseTransaction} />);

    expect(screen.getByText('SELECT *')).toBeInTheDocument();
  });

  it('renders N/A when span.span is missing', () => {
    const spanWithoutInner = {
      ...baseSpan,
      span: undefined,
    } as unknown as Span;

    renderWithTheme(<StickySpanProperties span={spanWithoutInner} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('does not crash when transaction.agent is missing', () => {
    const txWithoutAgent = {
      ...baseTransaction,
      agent: undefined,
    } as unknown as Transaction;

    renderWithTheme(<StickySpanProperties span={baseSpan} transaction={txWithoutAgent} />);

    expect(screen.getByText('SELECT *')).toBeInTheDocument();
    expect(screen.getByText('my-service')).toBeInTheDocument();
  });

  it('renders N/A for service when transaction.service is missing, and transaction name as plain text', () => {
    const txWithoutService = {
      ...baseTransaction,
      service: undefined,
    } as unknown as Transaction;

    renderWithTheme(<StickySpanProperties span={baseSpan} transaction={txWithoutService} />);

    expect(screen.getByText('SELECT *')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('GET /api')).toBeInTheDocument();
  });

  it('renders N/A for transaction name when transaction sub-object is missing', () => {
    const txWithoutInner = {
      ...baseTransaction,
      transaction: undefined,
    } as unknown as Transaction;

    renderWithTheme(<StickySpanProperties span={baseSpan} transaction={txWithoutInner} />);

    expect(screen.getByText('SELECT *')).toBeInTheDocument();
    expect(screen.getByText('my-service')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders without transaction', () => {
    renderWithTheme(<StickySpanProperties span={baseSpan} />);

    expect(screen.getByText('SELECT *')).toBeInTheDocument();
  });
});
