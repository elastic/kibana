/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useTransactionDetailFlyoutSummaryItems } from './summary';

const mockUseTransactionDetailFlyoutContext = jest.fn();
jest.mock('./transaction_detail_flyout_context', () => ({
  useTransactionDetailFlyoutContext: () => mockUseTransactionDetailFlyoutContext(),
}));

const FILTERS = {
  serviceName: 'checkout',
  transactionName: 'GET /api/orders',
  transactionType: 'request',
  environment: 'production',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  start: '2026-09-18T15:22:22.094Z',
  end: '2026-09-18T15:37:22.094Z',
};

function makeContext(timeZone: string, filters = FILTERS) {
  return {
    deps: {
      core: {
        uiSettings: {
          get: (key: string) => {
            if (key === 'dateFormat:tz') {
              return timeZone;
            }
            return 'MMM D, YYYY @ HH:mm:ss.SSS';
          },
        },
      },
    },
    filters,
  };
}

function renderSummaryItems() {
  return renderHook(() => useTransactionDetailFlyoutSummaryItems());
}

describe('useTransactionDetailFlyoutSummaryItems', () => {
  beforeEach(() => {
    mockUseTransactionDetailFlyoutContext.mockReturnValue(makeContext('UTC'));
  });

  it('renders environment, type, and a combined date range', () => {
    const { result } = renderSummaryItems();

    expect(result.current).toEqual([
      { id: 'environment', title: 'Environment', value: 'production' },
      { id: 'transactionType', title: 'Transaction type', value: 'request' },
      {
        id: 'dateRange',
        title: 'Date range',
        value: 'Sep 18, 2026 @ 15:22:22.094 → Sep 18, 2026 @ 15:37:22.094',
      },
    ]);
  });

  it('formats the date range with the configured Kibana timezone', () => {
    mockUseTransactionDetailFlyoutContext.mockReturnValue(makeContext('America/New_York'));

    const { result } = renderSummaryItems();

    expect(result.current.find(({ id }) => id === 'dateRange')?.value).toBe(
      'Sep 18, 2026 @ 11:22:22.094 → Sep 18, 2026 @ 11:37:22.094'
    );
  });

  it('updates immediately when service flyout filters change', () => {
    const { result, rerender } = renderSummaryItems();

    mockUseTransactionDetailFlyoutContext.mockReturnValue(
      makeContext('UTC', {
        ...FILTERS,
        environment: 'staging',
        rangeFrom: 'now-1h',
        rangeTo: 'now',
        start: '2026-09-18T14:37:22.094Z',
        end: '2026-09-18T15:37:22.094Z',
      })
    );

    rerender();

    expect(result.current.find(({ id }) => id === 'environment')?.value).toBe('staging');
    expect(result.current.find(({ id }) => id === 'dateRange')?.value).toBe(
      'Sep 18, 2026 @ 14:37:22.094 → Sep 18, 2026 @ 15:37:22.094'
    );
  });
});
