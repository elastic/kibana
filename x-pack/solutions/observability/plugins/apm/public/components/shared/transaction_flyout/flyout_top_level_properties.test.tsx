/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { FlyoutTopLevelProperties } from './flyout_top_level_properties';

vi.mock('../../../hooks/use_apm_params', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_apm_router', () => {
  const mocked = {
    useApmRouter: () => ({
      link: vi.fn().mockReturnValue('/mock-link'),
    }),
  };
  return { ...mocked, default: mocked };
});

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

describe('FlyoutTopLevelProperties', () => {
  it('renders null when transaction is undefined', () => {
    const { container } = renderWithTheme(<FlyoutTopLevelProperties transaction={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders service and transaction links with complete data', () => {
    renderWithTheme(<FlyoutTopLevelProperties transaction={baseTransaction} />);

    expect(screen.getByText('my-service')).toBeInTheDocument();
    expect(screen.getByText('GET /api')).toBeInTheDocument();
  });

  it('does not crash when agent is missing', () => {
    const txWithoutAgent = {
      ...baseTransaction,
      agent: undefined,
    } as unknown as Transaction;

    renderWithTheme(<FlyoutTopLevelProperties transaction={txWithoutAgent} />);

    expect(screen.getByText('my-service')).toBeInTheDocument();
    expect(screen.getByText('GET /api')).toBeInTheDocument();
  });

  it('renders N/A for service when service is missing, and transaction name as plain text', () => {
    const txWithoutService = {
      ...baseTransaction,
      service: undefined,
    } as unknown as Transaction;

    renderWithTheme(<FlyoutTopLevelProperties transaction={txWithoutService} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('GET /api')).toBeInTheDocument();
  });

  it('renders N/A for transaction when transaction sub-object is missing', () => {
    const txWithoutInner = {
      ...baseTransaction,
      transaction: undefined,
    } as unknown as Transaction;

    renderWithTheme(<FlyoutTopLevelProperties transaction={txWithoutInner} />);

    expect(screen.getByText('my-service')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
