/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import type { TraceItem } from '../../../../../common/waterfall/unified_trace_item';
import { MaybeViewTraceLink } from './maybe_view_trace_link';

const rootTransactionItem: TraceItem = {
  id: 'root-tx',
  name: 'GET /api/root',
  timestampUs: 1_000_000,
  traceId: 'trace-xyz',
  duration: 1_000_000,
  errors: [],
  serviceName: 'root-service',
  serviceEnvironment: 'production',
  type: 'request',
  spanLinksCount: { incoming: 0, outgoing: 0 },
  docType: 'transaction',
};

const childTransactionItem: TraceItem = {
  id: 'child-tx',
  parentId: 'root-tx',
  name: 'POST /api/child',
  timestampUs: 1_500_000,
  traceId: 'trace-xyz',
  duration: 200_000,
  errors: [],
  serviceName: 'child-service',
  spanLinksCount: { incoming: 0, outgoing: 0 },
  docType: 'transaction',
};

const rootSpanItem: TraceItem = {
  id: 'root-span',
  name: 'some span',
  timestampUs: 1_000_000,
  traceId: 'trace-xyz',
  duration: 1_000_000,
  errors: [],
  serviceName: 'root-service',
  type: 'db',
  spanLinksCount: { incoming: 0, outgoing: 0 },
  docType: 'span',
};

function buildTransaction(id: string): Transaction {
  return {
    transaction: { id },
  } as Transaction;
}

const mockOnViewFullTrace = jest.fn();

function renderLink(props: Partial<React.ComponentProps<typeof MaybeViewTraceLink>> = {}) {
  return render(
    <I18nProvider>
      <MaybeViewTraceLink
        isLoading={false}
        transaction={buildTransaction('child-tx')}
        traceItems={[rootTransactionItem, childTransactionItem]}
        onViewFullTrace={mockOnViewFullTrace}
        {...props}
      />
    </I18nProvider>
  );
}

describe('MaybeViewTraceLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a button and no link when isLoading is true', () => {
    renderLink({ isLoading: true, transaction: undefined });

    expect(screen.getByTestId('apmFullTraceButtonViewFullTraceButton')).toBeInTheDocument();
    expect(screen.queryByTestId('apmTransactionDetailLinkLink')).not.toBeInTheDocument();
  });

  it('renders a button and no link when transaction is undefined', () => {
    renderLink({ transaction: undefined });

    expect(screen.getByTestId('apmFullTraceButtonViewFullTraceButton')).toBeInTheDocument();
    expect(screen.queryByTestId('apmTransactionDetailLinkLink')).not.toBeInTheDocument();
  });

  it('renders a disabled button with "trace parent cannot be found" tooltip when there is no root', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderLink({ traceItems: [] });

    const button = screen.getByTestId('apmFullTraceButtonViewFullTraceButton');
    expect(button).toBeDisabled();

    await user.hover(button);
    expect(await screen.findByText('The trace parent cannot be found')).toBeInTheDocument();
  });

  it('renders the "trace parent cannot be found" tooltip when the root item is a span', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderLink({ traceItems: [rootSpanItem] });

    const button = screen.getByTestId('apmFullTraceButtonViewFullTraceButton');
    expect(button).toBeDisabled();

    await user.hover(button);
    expect(await screen.findByText('The trace parent cannot be found')).toBeInTheDocument();
  });

  it('renders a disabled button with "viewing the full trace" tooltip when the current transaction is the root', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderLink({ transaction: buildTransaction('root-tx') });

    const button = screen.getByTestId('apmFullTraceButtonViewFullTraceButton');
    expect(button).toBeDisabled();

    await user.hover(button);
    expect(await screen.findByText('Currently viewing the full trace')).toBeInTheDocument();
  });

  it('calls onViewFullTrace when the button is clicked and the current transaction is not root', async () => {
    const user = userEvent.setup();
    renderLink();

    const button = screen.getByTestId('apmFullTraceButtonViewFullTraceButton');
    expect(button).not.toBeDisabled();

    await user.click(button);
    expect(mockOnViewFullTrace).toHaveBeenCalledTimes(1);
  });
});
