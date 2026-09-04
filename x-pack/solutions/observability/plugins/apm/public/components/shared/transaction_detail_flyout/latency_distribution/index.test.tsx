/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TransactionDetailFlyoutLatencyDistribution } from '.';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';
import { useTransactionDetailFlyoutDistributionChartData } from './use_transaction_detail_flyout_distribution_chart_data';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

jest.mock('../transaction_detail_flyout_context');
jest.mock('./use_transaction_detail_flyout_distribution_chart_data');
jest.mock('@kbn/apm-ui-shared', () => ({
  DurationDistributionChart: ({
    'data-test-subj': testSubj,
    loading,
    hasError,
  }: {
    'data-test-subj'?: string;
    loading: boolean;
    hasError: boolean;
  }) => <div data-test-subj={testSubj} data-loading={loading} data-has-error={hasError} />,
}));

const mockedUseTransactionDetailFlyoutContext = useTransactionDetailFlyoutContext as jest.Mock;
const mockedUseTransactionDetailFlyoutDistributionChartData =
  useTransactionDetailFlyoutDistributionChartData as jest.Mock;

const FILTERS = {
  serviceName: 'checkout',
  transactionName: 'oteldemo.CheckoutService/PlaceOrder',
  transactionType: 'request',
  environment: 'oteldemo',
  rangeFrom: '2026-08-20T10:00:00.000Z',
  rangeTo: '2026-08-21T10:43:35.610Z',
};

describe('TransactionDetailFlyoutLatencyDistribution', () => {
  beforeEach(() => {
    mockedUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: { core: { notifications: { toasts: { addDanger: jest.fn() } } } },
      filters: FILTERS,
    });
    mockedUseTransactionDetailFlyoutDistributionChartData.mockReturnValue({
      chartData: [
        {
          id: 'All transactions',
          histogram: [{ key: 1000, doc_count: 5 }],
          areaSeriesColor: '#000',
        },
      ],
      hasData: true,
      percentileThresholdValue: 1200,
      status: FETCH_STATUS.SUCCESS,
      totalDocCount: 42,
    });
  });

  it('renders the latency distribution section and chart', () => {
    render(<TransactionDetailFlyoutLatencyDistribution />);

    expect(
      screen.getByTestId('transactionDetailFlyoutSection-latencyDistribution')
    ).toBeInTheDocument();
    expect(screen.getByTestId('transactionDetailFlyoutLatencyDistributionTitle')).toHaveTextContent(
      'Latency distribution'
    );
    expect(
      screen.getByTestId('transactionDetailFlyoutLatencyDistributionChart')
    ).toBeInTheDocument();
    expect(mockedUseTransactionDetailFlyoutDistributionChartData).toHaveBeenCalledWith(FILTERS);
  });

  it('passes loading and error state to the chart', () => {
    mockedUseTransactionDetailFlyoutDistributionChartData.mockReturnValue({
      chartData: [],
      hasData: false,
      percentileThresholdValue: 0,
      status: FETCH_STATUS.LOADING,
      totalDocCount: undefined,
    });

    render(<TransactionDetailFlyoutLatencyDistribution />);

    const chart = screen.getByTestId('transactionDetailFlyoutLatencyDistributionChart');
    expect(chart).toHaveAttribute('data-loading', 'true');
    expect(chart).toHaveAttribute('data-has-error', 'false');
  });

  it('treats NOT_INITIATED as loading so the shared chart does not mount empty', () => {
    mockedUseTransactionDetailFlyoutDistributionChartData.mockReturnValue({
      chartData: [
        {
          id: 'All transactions',
          histogram: [],
          areaSeriesColor: '#000',
        },
      ],
      hasData: false,
      percentileThresholdValue: undefined,
      status: FETCH_STATUS.NOT_INITIATED,
      totalDocCount: undefined,
    });

    render(<TransactionDetailFlyoutLatencyDistribution />);

    const chart = screen.getByTestId('transactionDetailFlyoutLatencyDistributionChart');
    expect(chart).toHaveAttribute('data-loading', 'true');
  });
});
