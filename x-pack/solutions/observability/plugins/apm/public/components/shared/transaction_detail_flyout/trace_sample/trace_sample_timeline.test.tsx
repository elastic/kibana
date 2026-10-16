/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { TraceItem } from '@kbn/apm-types';
import { TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { TransactionDetailFlyoutTraceSampleTimeline } from './trace_sample_timeline';

let capturedTraceWaterfallProps: Record<string, unknown> = {};

jest.mock('@kbn/apm-ui-shared', () => ({
  TraceWaterfall: (props: Record<string, unknown>) => {
    capturedTraceWaterfallProps = props;
    return <div data-test-subj="mock-trace-waterfall" />;
  },
  useGetServiceBadgeHrefFromCore: () => () => '/service',
}));

jest.mock('../transaction_detail_flyout_context', () => ({
  useTransactionDetailFlyoutContext: () => ({
    deps: { core: {} },
    filters: { rangeFrom: 'now-15m', rangeTo: 'now' },
  }),
}));

const TRACE_ITEMS: TraceItem[] = [
  {
    id: 'tx-1',
    name: 'GET /api/orders',
    timestampUs: 1_000_000,
    traceId: 'trace-1',
    duration: 100_000,
    errors: [],
    serviceName: 'checkout',
    spanLinksCount: { incoming: 0, outgoing: 0 },
    docType: 'transaction',
  },
];

describe('TransactionDetailFlyoutTraceSampleTimeline', () => {
  afterEach(() => {
    cleanup();
    capturedTraceWaterfallProps = {};
  });

  it('passes transaction-detail-flyout waterfall EBT elements to TraceWaterfall', () => {
    render(
      <IntlProvider locale="en">
        <TransactionDetailFlyoutTraceSampleTimeline
          traceItems={TRACE_ITEMS}
          errors={[]}
          agentMarks={{}}
          serviceName="checkout"
          entryTransactionId="tx-1"
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('mock-trace-waterfall')).toBeInTheDocument();
    expect(capturedTraceWaterfallProps.ebt).toEqual({
      row: { element: TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS.WATERFALL_ROW },
      errorBadge: { element: TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS.WATERFALL_ERROR_BADGE },
      serviceBadge: { element: TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS.WATERFALL_SERVICE_BADGE },
    });
  });
});
