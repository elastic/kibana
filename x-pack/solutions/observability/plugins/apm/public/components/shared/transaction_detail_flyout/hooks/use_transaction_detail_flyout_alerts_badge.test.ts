/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { SERVICE_ALERTS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { useTransactionDetailFlyoutAlertsBadge } from './use_transaction_detail_flyout_alerts_badge';

const mockUseTransactionDetailFlyoutContext = jest.fn();
jest.mock('../transaction_detail_flyout_context', () => ({
  useTransactionDetailFlyoutContext: () => mockUseTransactionDetailFlyoutContext(),
}));

function setupContext({
  alertsCount,
  schema = 'ecs',
  canReadAlerts = true,
  href = '/app/apm/services/checkout/alerts?kuery=transaction.name:%20%22GET%22',
  share,
}: {
  alertsCount?: number;
  schema?: 'ecs' | 'otel' | 'unknown';
  canReadAlerts?: boolean;
  href?: string | undefined;
  /** Pass `null` to simulate a host without share/locators. */
  share?: unknown | null;
} = {}) {
  const getRedirectUrl = jest.fn().mockReturnValue(href);
  const getLocator = jest.fn().mockReturnValue({ getRedirectUrl });

  mockUseTransactionDetailFlyoutContext.mockReturnValue({
    deps: {
      core: {
        application: {
          capabilities: {
            apm: { 'alerting:show': canReadAlerts },
          },
        },
      },
      share:
        share === null
          ? undefined
          : share ?? {
              url: {
                locators: { get: getLocator },
              },
            },
    },
    filters: {
      serviceName: 'checkout',
      transactionName: 'GET /api/orders',
      transactionType: 'request',
      environment: 'production',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-01T00:15:00.000Z',
    },
    schema,
    alertsCount,
    refreshToken: 0,
    openFullTraceFlyout: jest.fn(),
  });

  return { getLocator, getRedirectUrl };
}

describe('useTransactionDetailFlyoutAlertsBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the badge with a transaction-scoped alerts href when count > 0', () => {
    const { getLocator, getRedirectUrl } = setupContext({ alertsCount: 3 });

    const { result } = renderHook(() => useTransactionDetailFlyoutAlertsBadge());

    expect(result.current).toEqual({
      show: true,
      count: 3,
      href: '/app/apm/services/checkout/alerts?kuery=transaction.name:%20%22GET%22',
    });
    expect(getLocator).toHaveBeenCalledWith(SERVICE_ALERTS_LOCATOR_ID);
    expect(getRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'checkout',
      transactionName: 'GET /api/orders',
      transactionType: 'request',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    });
  });

  it('hides the badge when alertsCount is 0', () => {
    setupContext({ alertsCount: 0 });

    const { result } = renderHook(() => useTransactionDetailFlyoutAlertsBadge());

    expect(result.current).toEqual({ show: false, count: 0 });
  });

  it('hides the badge when alertsCount is undefined', () => {
    setupContext({ alertsCount: undefined });

    const { result } = renderHook(() => useTransactionDetailFlyoutAlertsBadge());

    expect(result.current).toEqual({ show: false, count: 0 });
  });

  it('hides the badge when the user cannot read alerts', () => {
    setupContext({ alertsCount: 4, canReadAlerts: false });

    const { result } = renderHook(() => useTransactionDetailFlyoutAlertsBadge());

    expect(result.current).toEqual({ show: false, count: 0 });
  });

  it('hides the badge for otel schema', () => {
    setupContext({ alertsCount: 4, schema: 'otel' });

    const { result } = renderHook(() => useTransactionDetailFlyoutAlertsBadge());

    expect(result.current).toEqual({ show: false, count: 0 });
  });

  it('still shows the badge without href when the locator is unavailable', () => {
    setupContext({ alertsCount: 2, share: null });

    const { result } = renderHook(() => useTransactionDetailFlyoutAlertsBadge());

    expect(result.current).toEqual({ show: true, count: 2, href: undefined });
  });
});
