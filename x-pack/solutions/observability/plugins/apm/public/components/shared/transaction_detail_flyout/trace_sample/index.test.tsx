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
jest.mock('./trace_sample_timeline', () => ({
  TransactionDetailFlyoutTraceSampleTimeline: () => (
    <div data-test-subj="transactionDetailFlyoutTraceSampleTimeline" />
  ),
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
  traceItems: [{ id: 'span-1', traceId: 'trace-1' }],
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
    mockedUseTransactionDetailFlyoutContext.mockReturnValue({
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

    expect(screen.getByTestId('transactionDetailFlyoutSection-traceSample')).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleTitle')).toHaveTextContent(
      'Trace sample'
    );
    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleSummary')).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutTraceSampleTimeline')).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutViewFullTraceLink')).toBeInTheDocument();
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
});
