/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { TransactionDetailFlyoutRedMetrics } from '.';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';
import { useTransactionDetailFlyoutRedMetricsCharts } from './use_transaction_detail_flyout_red_metrics_charts';

jest.mock('../transaction_detail_flyout_context');
jest.mock('./use_transaction_detail_flyout_red_metrics_charts');
jest.mock('../../../../context/chart_pointer_event/chart_pointer_event_context', () => ({
  ChartPointerEventContextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
jest.mock('../../charts/timeseries_chart', () => ({
  TimeseriesChart: ({ id }: { id: string }) => <div data-test-subj={id} />,
}));

const mockedUseTransactionDetailFlyoutContext = useTransactionDetailFlyoutContext as jest.Mock;
const mockedUseTransactionDetailFlyoutRedMetricsCharts =
  useTransactionDetailFlyoutRedMetricsCharts as jest.Mock;

const FILTERS = {
  serviceName: 'checkout',
  transactionName: 'oteldemo.CheckoutService/PlaceOrder',
  transactionType: 'request',
  environment: 'oteldemo',
  rangeFrom: '2026-08-20T10:00:00.000Z',
  rangeTo: '2026-08-21T10:43:35.610Z',
};

const CHARTS_RESULT = {
  latencyTimeseries: [{ data: [] }],
  latencyStatus: FETCH_STATUS.SUCCESS,
  throughputTimeseries: [{ data: [] }],
  throughputStatus: FETCH_STATUS.SUCCESS,
  errorRateTimeseries: [{ data: [] }],
  errorRateStatus: FETCH_STATUS.SUCCESS,
  isLoading: false,
  hasError: false,
};

describe('TransactionDetailFlyoutRedMetrics', () => {
  beforeEach(() => {
    mockedUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: { core: { uiSettings: { get: () => 'UTC' } } },
      filters: FILTERS,
    });
    mockedUseTransactionDetailFlyoutRedMetricsCharts.mockReturnValue(CHARTS_RESULT);
  });

  it('renders RED metrics charts using the transaction details data path', () => {
    render(<TransactionDetailFlyoutRedMetrics />);

    expect(screen.getByTestId('transactionDetailFlyoutSection-redMetrics')).toBeInTheDocument();
    expect(
      screen.getByTestId('transactionDetailFlyoutRedMetricsChart-latency')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('transactionDetailFlyoutRedMetricsChart-throughput')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('transactionDetailFlyoutRedMetricsChart-failedTransactionRate')
    ).toBeInTheDocument();
    expect(mockedUseTransactionDetailFlyoutRedMetricsCharts).toHaveBeenCalledWith(
      expect.objectContaining(FILTERS)
    );
  });

  it('shows a skeleton while charts are loading', () => {
    mockedUseTransactionDetailFlyoutRedMetricsCharts.mockReturnValue({
      ...CHARTS_RESULT,
      isLoading: true,
    });

    render(<TransactionDetailFlyoutRedMetrics />);

    expect(screen.getByTestId('transactionDetailFlyoutRedMetricsSkeleton')).toBeInTheDocument();
  });

  it('shows an error callout when chart requests fail', () => {
    mockedUseTransactionDetailFlyoutRedMetricsCharts.mockReturnValue({
      ...CHARTS_RESULT,
      hasError: true,
    });

    render(<TransactionDetailFlyoutRedMetrics />);

    expect(screen.getByTestId('transactionDetailFlyoutRedMetricsError')).toBeInTheDocument();
  });
});
