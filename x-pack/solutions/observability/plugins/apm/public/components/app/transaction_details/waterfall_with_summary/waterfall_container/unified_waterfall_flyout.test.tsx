/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import type { TraceItem } from '../../../../../../common/waterfall/unified_trace_item';
import { UnifiedWaterfallFlyout } from './unified_waterfall_flyout';
import { useTraceWaterfallContext } from '../../../../shared/trace_waterfall/trace_waterfall_context';

jest.mock('../../../../shared/trace_waterfall/trace_waterfall_context', () => ({
  useTraceWaterfallContext: jest.fn(),
}));

jest.mock('../../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: {
      flyoutDetailTab: 'metadata',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    },
  }),
}));

jest.mock('../../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start: '2025-01-15T11:00:00.000Z',
    end: '2025-01-15T13:00:00.000Z',
  }),
}));

jest.mock('../../../../shared/span_flyout', () => ({
  SpanFlyout: jest.fn((props) => (
    <div data-test-subj="mockSpanFlyout" data-props={JSON.stringify(props)} />
  )),
}));

jest.mock('../../../../shared/transaction_flyout', () => ({
  TransactionFlyout: jest.fn((props) => (
    <div data-test-subj="mockTransactionFlyout" data-props={JSON.stringify(props)} />
  )),
}));

const mockUseTraceWaterfallContext = useTraceWaterfallContext as jest.MockedFunction<
  typeof useTraceWaterfallContext
>;

const { SpanFlyout } = jest.requireMock('../../../../shared/span_flyout');
const { TransactionFlyout } = jest.requireMock('../../../../shared/transaction_flyout');

const ROOT_TRANSACTION: TraceItem = {
  id: 'transaction-1',
  name: 'GET /api/products',
  timestampUs: 1_737_000_000_000_000,
  traceId: 'trace-abc',
  duration: 2_000_000,
  errors: [{ errorDocId: 'err-1' }, { errorDocId: 'err-2' }],
  serviceName: 'products-service',
  spanLinksCount: { incoming: 3, outgoing: 1 },
  docType: 'transaction',
};

const CHILD_SPAN: TraceItem = {
  id: 'span-1',
  parentId: 'transaction-1',
  name: 'SELECT * FROM products',
  timestampUs: 1_737_000_000_100_000,
  traceId: 'trace-abc',
  duration: 500_000,
  errors: [],
  serviceName: 'products-service',
  spanLinksCount: { incoming: 5, outgoing: 2 },
  docType: 'span',
};

function renderFlyout({
  waterfallItemId,
  traceItems = [ROOT_TRANSACTION, CHILD_SPAN],
  toggleFlyout = jest.fn(),
  rootItem = ROOT_TRANSACTION,
  duration = ROOT_TRANSACTION.duration,
}: {
  waterfallItemId?: string;
  traceItems?: TraceItem[];
  toggleFlyout?: jest.Mock;
  rootItem?: TraceItem;
  duration?: number;
} = {}) {
  mockUseTraceWaterfallContext.mockReturnValue({
    duration,
    rootItem,
  } as any);

  const history = createMemoryHistory();
  const utils = render(
    <Router history={history}>
      <UnifiedWaterfallFlyout
        waterfallItemId={waterfallItemId}
        traceItems={traceItems}
        toggleFlyout={toggleFlyout}
      />
    </Router>
  );

  return { ...utils, history, toggleFlyout };
}

describe('UnifiedWaterfallFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when waterfallItemId is undefined', () => {
    const { container } = renderFlyout();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when waterfallItemId does not match any trace item', () => {
    const { container } = renderFlyout({ waterfallItemId: 'does-not-exist' });
    expect(container).toBeEmptyDOMElement();
  });

  describe('when the selected item is a transaction', () => {
    it('renders the TransactionFlyout with props from the trace item and context', () => {
      const { getByTestId } = renderFlyout({ waterfallItemId: 'transaction-1' });

      expect(getByTestId('mockTransactionFlyout')).toBeInTheDocument();
      expect(TransactionFlyout).toHaveBeenCalledTimes(1);
      expect(TransactionFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'transaction-1',
          traceId: 'trace-abc',
          rootTransactionDuration: ROOT_TRANSACTION.duration,
          errorCount: 2,
          spanLinksCount: { linkedChildren: 3, linkedParents: 1 },
          flyoutDetailTab: 'metadata',
          start: '2025-01-15T11:00:00.000Z',
          end: '2025-01-15T13:00:00.000Z',
        }),
        expect.anything()
      );
    });

    it('passes rootTransactionDuration undefined when the root is a span', () => {
      const spanRoot: TraceItem = { ...CHILD_SPAN, id: 'root-span', parentId: undefined };
      renderFlyout({
        waterfallItemId: 'transaction-1',
        rootItem: spanRoot,
      });

      expect(TransactionFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ rootTransactionDuration: undefined }),
        expect.anything()
      );
    });

    it('calls toggleFlyout when onClose is invoked', () => {
      const toggleFlyout = jest.fn();
      renderFlyout({ waterfallItemId: 'transaction-1', toggleFlyout });

      const props = TransactionFlyout.mock.calls[0][0];
      props.onClose();

      expect(toggleFlyout).toHaveBeenCalledTimes(1);
      expect(toggleFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ history: expect.any(Object) })
      );
    });
  });

  describe('when the selected item is a span', () => {
    it('renders the SpanFlyout with parentTransactionId when the parent is a transaction', () => {
      const { getByTestId } = renderFlyout({ waterfallItemId: 'span-1' });

      expect(getByTestId('mockSpanFlyout')).toBeInTheDocument();
      expect(SpanFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          spanId: 'span-1',
          traceId: 'trace-abc',
          totalDuration: ROOT_TRANSACTION.duration,
          parentTransactionId: 'transaction-1',
          spanLinksCount: { linkedChildren: 5, linkedParents: 2 },
          flyoutDetailTab: 'metadata',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        }),
        expect.anything()
      );
    });

    it('passes parentTransactionId undefined when the parent is a span', () => {
      const parentSpan: TraceItem = { ...CHILD_SPAN, id: 'parent-span' };
      const childSpan: TraceItem = { ...CHILD_SPAN, id: 'span-1', parentId: 'parent-span' };

      renderFlyout({
        waterfallItemId: 'span-1',
        traceItems: [ROOT_TRANSACTION, parentSpan, childSpan],
      });

      expect(SpanFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ parentTransactionId: undefined }),
        expect.anything()
      );
    });

    it('passes parentTransactionId undefined when the span has no parent', () => {
      const orphanSpan: TraceItem = { ...CHILD_SPAN, id: 'orphan', parentId: undefined };
      renderFlyout({
        waterfallItemId: 'orphan',
        traceItems: [ROOT_TRANSACTION, orphanSpan],
      });

      expect(SpanFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ parentTransactionId: undefined }),
        expect.anything()
      );
    });

    it('calls toggleFlyout when onClose is invoked', () => {
      const toggleFlyout = jest.fn();
      renderFlyout({ waterfallItemId: 'span-1', toggleFlyout });

      const props = SpanFlyout.mock.calls[0][0];
      props.onClose();

      expect(toggleFlyout).toHaveBeenCalledTimes(1);
      expect(toggleFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ history: expect.any(Object) })
      );
    });
  });
});
