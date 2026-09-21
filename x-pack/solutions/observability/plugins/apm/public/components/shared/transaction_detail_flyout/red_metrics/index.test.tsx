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
jest.mock('../../service_flyout/hooks/use_project_routing', () => ({
  useProjectRouting: () => undefined,
}));
jest.mock('../../service_flyout/overview/chart_configs', () => ({
  getEsqlKeyMetricCharts: jest.fn(() => [
    { id: 'latency', title: 'Latency', config: { dataset: { esql: 'FROM traces' } } },
    {
      id: 'failedTransactionRate',
      title: 'Failed transaction rate',
      config: { dataset: { esql: 'FROM traces' } },
    },
    { id: 'throughput', title: 'Throughput', config: { dataset: { esql: 'FROM traces' } } },
  ]),
}));
jest.mock('../../service_flyout/overview/lens_chart', () => ({
  FlyoutLensChart: ({ id }: { id: string }) => (
    <div data-test-subj={`transactionDetailFlyoutLensChart-${id}`} />
  ),
}));

const mockedUseTransactionDetailFlyoutContext = useTransactionDetailFlyoutContext as jest.Mock;
const mockedUseTransactionDetailFlyoutRedMetricsCharts =
  useTransactionDetailFlyoutRedMetricsCharts as jest.Mock;

const { getEsqlKeyMetricCharts } = jest.requireMock('../../service_flyout/overview/chart_configs');

const FILTERS = {
  serviceName: 'checkout',
  transactionName: 'oteldemo.CheckoutService/PlaceOrder',
  transactionType: 'request',
  environment: 'oteldemo',
  rangeFrom: '2026-08-20T10:00:00.000Z',
  rangeTo: '2026-08-21T10:43:35.610Z',
};

const MOCK_INDICES = {
  transaction: 'traces-apm*',
  metric: 'metrics-apm*',
  span: 'traces-apm*',
  error: 'logs-apm*',
  onboarding: 'apm-*',
  sourcemap: 'apm-*',
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

const LENS = { EmbeddableComponent: () => null };
const DATA_VIEWS = {};

describe('TransactionDetailFlyoutRedMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTransactionDetailFlyoutContext.mockReturnValue({
      deps: { core: { uiSettings: { get: () => 'UTC' } } },
      filters: FILTERS,
    });
    mockedUseTransactionDetailFlyoutRedMetricsCharts.mockReturnValue(CHARTS_RESULT);
  });

  describe('APM API path', () => {
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
      expect(getEsqlKeyMetricCharts).not.toHaveBeenCalled();
    });

    it('shows a skeleton while charts are loading', () => {
      mockedUseTransactionDetailFlyoutRedMetricsCharts.mockReturnValue({
        ...CHARTS_RESULT,
        isLoading: true,
      });

      render(<TransactionDetailFlyoutRedMetrics />);

      expect(screen.getByTestId('transactionDetailFlyoutRedMetricsSkeleton')).toBeInTheDocument();
    });

    it('keeps charts mounted when only latency is refetching', () => {
      mockedUseTransactionDetailFlyoutRedMetricsCharts.mockReturnValue({
        ...CHARTS_RESULT,
        latencyStatus: FETCH_STATUS.LOADING,
        isLoading: false,
      });

      render(<TransactionDetailFlyoutRedMetrics />);

      expect(
        screen.queryByTestId('transactionDetailFlyoutRedMetricsSkeleton')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('transactionDetailFlyoutRedMetricsChart-throughput')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('transactionDetailFlyoutRedMetricsChart-failedTransactionRate')
      ).toBeInTheDocument();
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

  describe('ES|QL path', () => {
    it('uses ES|QL Lens charts when preferDocumentBasedCharts is true', () => {
      mockedUseTransactionDetailFlyoutContext.mockReturnValue({
        deps: { core: { uiSettings: { get: () => 'UTC' } }, lens: LENS, dataViews: DATA_VIEWS },
        filters: FILTERS,
        preferDocumentBasedCharts: true,
        schema: 'ecs',
        indices: MOCK_INDICES,
      });

      render(<TransactionDetailFlyoutRedMetrics />);

      expect(screen.getByTestId('transactionDetailFlyoutEsqlRedMetrics')).toBeInTheDocument();
      expect(screen.getByTestId('transactionDetailFlyoutLensChart-latency')).toBeInTheDocument();
      expect(
        screen.getByTestId('transactionDetailFlyoutLensChart-failedTransactionRate')
      ).toBeInTheDocument();
      expect(screen.getByTestId('transactionDetailFlyoutLensChart-throughput')).toBeInTheDocument();
      expect(mockedUseTransactionDetailFlyoutRedMetricsCharts).not.toHaveBeenCalled();
      expect(getEsqlKeyMetricCharts).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionName: FILTERS.transactionName,
          serviceName: FILTERS.serviceName,
          schema: 'ecs',
        })
      );
    });

    it('uses ES|QL Lens charts for otel schema even without preferDocumentBasedCharts', () => {
      mockedUseTransactionDetailFlyoutContext.mockReturnValue({
        deps: { core: { uiSettings: { get: () => 'UTC' } }, lens: LENS, dataViews: DATA_VIEWS },
        filters: FILTERS,
        schema: 'otel',
        indices: MOCK_INDICES,
      });

      render(<TransactionDetailFlyoutRedMetrics />);

      expect(screen.getByTestId('transactionDetailFlyoutEsqlRedMetrics')).toBeInTheDocument();
      expect(mockedUseTransactionDetailFlyoutRedMetricsCharts).not.toHaveBeenCalled();
      expect(getEsqlKeyMetricCharts).toHaveBeenCalledWith(
        expect.objectContaining({ schema: 'otel', transactionName: FILTERS.transactionName })
      );
    });

    it('shows a skeleton while indices are loading', () => {
      mockedUseTransactionDetailFlyoutContext.mockReturnValue({
        deps: { core: { uiSettings: { get: () => 'UTC' } }, lens: LENS, dataViews: DATA_VIEWS },
        filters: FILTERS,
        preferDocumentBasedCharts: true,
        schema: 'ecs',
        indices: undefined,
      });

      render(<TransactionDetailFlyoutRedMetrics />);

      expect(screen.getByTestId('transactionDetailFlyoutRedMetricsSkeleton')).toBeInTheDocument();
    });

    it('shows an error callout when indices fail to load', () => {
      mockedUseTransactionDetailFlyoutContext.mockReturnValue({
        deps: { core: { uiSettings: { get: () => 'UTC' } }, lens: LENS, dataViews: DATA_VIEWS },
        filters: FILTERS,
        preferDocumentBasedCharts: true,
        schema: 'ecs',
        indices: null,
      });

      render(<TransactionDetailFlyoutRedMetrics />);

      expect(screen.getByTestId('transactionDetailFlyoutRedMetricsError')).toBeInTheDocument();
    });

    it('shows an error callout when lens or dataViews are missing', () => {
      mockedUseTransactionDetailFlyoutContext.mockReturnValue({
        deps: { core: { uiSettings: { get: () => 'UTC' } } },
        filters: FILTERS,
        preferDocumentBasedCharts: true,
        schema: 'ecs',
        indices: MOCK_INDICES,
      });

      render(<TransactionDetailFlyoutRedMetrics />);

      expect(screen.getByTestId('transactionDetailFlyoutRedMetricsError')).toBeInTheDocument();
    });
  });
});
