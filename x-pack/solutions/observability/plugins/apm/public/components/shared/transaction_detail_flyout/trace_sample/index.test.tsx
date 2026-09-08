/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useUnifiedWaterfallFetcher } from '../../../app/transaction_details/use_unified_waterfall_fetcher';
import { TransactionDetailFlyoutTraceSample } from '.';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';
import { useTransactionDetailFlyoutTraceSamplesFetcher } from './use_transaction_detail_flyout_trace_samples_fetcher';

jest.mock('../transaction_detail_flyout_context');
jest.mock('./use_transaction_detail_flyout_trace_samples_fetcher');
jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2026-08-20T10:00:00.000Z', end: '2026-08-21T10:43:35.610Z' }),
}));
jest.mock('../../../app/transaction_details/use_unified_waterfall_fetcher', () => ({
  useUnifiedWaterfallFetcher: jest.fn(),
}));
jest.mock('../../../app/transaction_details/waterfall_with_summary/maybe_view_trace_link', () => ({
  MaybeViewTraceLink: () => <div data-test-subj="transactionDetailFlyoutViewFullTraceLink" />,
}));
jest.mock('../../summary/transaction_summary', () => ({
  TransactionSummary: () => <div data-test-subj="transactionDetailFlyoutTraceSampleSummary" />,
}));
const mockTimeline = jest.fn((_props: { onNodeClick?: () => void }) => (
  <div data-test-subj="transactionDetailFlyoutTraceSampleTimeline" />
));
jest.mock('./trace_sample_timeline', () => ({
  TransactionDetailFlyoutTraceSampleTimeline: (props: { onNodeClick?: () => void }) =>
    mockTimeline(props),
}));

const mockedUseTransactionDetailFlyoutContext = useTransactionDetailFlyoutContext as jest.Mock;
const mockedUseTransactionDetailFlyoutTraceSamplesFetcher =
  useTransactionDetailFlyoutTraceSamplesFetcher as jest.Mock;

const FILTERS = {
  serviceName: 'checkout',
  transactionName: 'user_add_to_cart',
  transactionType: 'request',
  environment: 'oteldemo',
  rangeFrom: '2026-08-20T10:00:00.000Z',
  rangeTo: '2026-08-21T10:43:35.610Z',
};

const mockedUseUnifiedWaterfallFetcher = useUnifiedWaterfallFetcher as jest.Mock;

const DEFAULT_WATERFALL_RESULT = {
  traceItems: [
    { id: 'tx-1', traceId: 'trace-1', parentId: undefined },
    { id: 'span-1', traceId: 'trace-1', parentId: 'tx-1' },
  ],
  errors: [],
  agentMarks: {},
  entryTransaction: {
    transaction: { id: 'tx-1', duration: { us: 1000 } },
    trace: { id: 'trace-1' },
  },
  traceDocsTotal: 1,
  maxTraceItems: 1000,
  status: FETCH_STATUS.SUCCESS,
};

describe('TransactionDetailFlyoutTraceSample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: { core: { notifications: { toasts: { addDanger: jest.fn() } } } },
      filters: FILTERS,
      openFullTraceFlyout: jest.fn(),
    });
    mockedUseTransactionDetailFlyoutTraceSamplesFetcher.mockReturnValue({
      data: {
        traceSamples: [
          {
            transactionId: 'tx-1',
            traceId: 'trace-1',
            timestamp: '2026-08-20T10:00:00.000Z',
            score: 1,
          },
        ],
      },
      status: FETCH_STATUS.SUCCESS,
      error: undefined,
    });
    mockedUseUnifiedWaterfallFetcher.mockReturnValue(DEFAULT_WATERFALL_RESULT);
  });

  it('renders trace sample section with summary and timeline', () => {
    render(<TransactionDetailFlyoutTraceSample />);

    expect(mockedUseUnifiedWaterfallFetcher).toHaveBeenCalledWith({
      start: '2026-08-20T10:00:00.000Z',
      end: '2026-08-21T10:43:35.610Z',
      traceId: 'trace-1',
      entryTransactionId: 'tx-1',
    });
    expect(screen.getByTestId('transactionDetailFlyoutSection-traceSample')).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleTitle')).toHaveTextContent(
      'Trace sample'
    );
    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleSummary')).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleTimeline')).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutViewFullTraceLink')).toBeInTheDocument();
    expect(mockTimeline).toHaveBeenCalledWith(
      expect.objectContaining({
        onNodeClick: expect.any(Function),
      })
    );
  });

  it('opens the full-trace flyout when a waterfall node is clicked', () => {
    const openFullTraceFlyout = jest.fn();
    mockedUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: { core: { notifications: { toasts: { addDanger: jest.fn() } } } },
      filters: FILTERS,
      openFullTraceFlyout,
    });

    render(<TransactionDetailFlyoutTraceSample />);

    const { onNodeClick } = mockTimeline.mock.calls[0][0];
    onNodeClick?.();

    expect(openFullTraceFlyout).toHaveBeenCalledWith({
      traceId: 'trace-1',
      contextSpanIds: expect.any(Array),
    });
  });

  it('renders empty prompt when no trace samples are available', () => {
    mockedUseTransactionDetailFlyoutTraceSamplesFetcher.mockReturnValue({
      data: { traceSamples: [] },
      status: FETCH_STATUS.SUCCESS,
      error: undefined,
    });
    mockedUseUnifiedWaterfallFetcher.mockReturnValue({
      traceItems: [],
      errors: [],
      agentMarks: {},
      entryTransaction: undefined,
      traceDocsTotal: 0,
      maxTraceItems: 1000,
      status: FETCH_STATUS.NOT_INITIATED,
    });

    render(<TransactionDetailFlyoutTraceSample />);

    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleEmpty')).toBeInTheDocument();
  });

  it('renders an error prompt when the trace samples fetch fails', () => {
    mockedUseTransactionDetailFlyoutTraceSamplesFetcher.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.FAILURE,
      error: new Error('failed'),
    });
    mockedUseUnifiedWaterfallFetcher.mockReturnValue({
      traceItems: [],
      errors: [],
      agentMarks: {},
      entryTransaction: undefined,
      traceDocsTotal: 0,
      maxTraceItems: 1000,
      status: FETCH_STATUS.NOT_INITIATED,
    });

    render(<TransactionDetailFlyoutTraceSample />);

    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleError')).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleError')).toHaveTextContent(
      'Unable to load the trace sample'
    );
    expect(
      screen.queryByTestId('transactionDetailFlyoutTraceSampleTimelineLoading')
    ).not.toBeInTheDocument();
  });

  it('renders an error prompt when the waterfall fetch fails', () => {
    mockedUseUnifiedWaterfallFetcher.mockReturnValue({
      ...DEFAULT_WATERFALL_RESULT,
      entryTransaction: undefined,
      traceItems: [],
      status: FETCH_STATUS.FAILURE,
    });

    render(<TransactionDetailFlyoutTraceSample />);

    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleError')).toBeInTheDocument();
  });
});
