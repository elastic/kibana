/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen, within } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
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
const mockTimeseriesChart = jest.fn();
jest.mock('../../charts/timeseries_chart', () => ({
  TimeseriesChart: (props: { id: string }) => {
    mockTimeseriesChart(props);
    return <div data-test-subj={props.id} />;
  },
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
  FlyoutLensChart: ({
    id,
    refreshToken,
    rangeFrom,
    rangeTo,
  }: {
    id: string;
    refreshToken?: number;
    rangeFrom: string;
    rangeTo: string;
  }) => (
    <div
      data-test-subj={`transactionDetailFlyoutLensChart-${id}`}
      data-refresh-token={refreshToken}
      data-range-from={rangeFrom}
      data-range-to={rangeTo}
    />
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
  start: '2026-08-20T10:00:00.000Z',
  end: '2026-08-21T10:43:35.610Z',
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

// Emotion serializes the rule without the spaces after commas.
const RED_METRICS_GRID_COLUMNS = 'repeat(auto-fit,minmax(160px,1fr))';

const API_CHART_PANEL_IDS = [
  'transactionDetailFlyoutRedMetricsChart-latency',
  'transactionDetailFlyoutRedMetricsChart-throughput',
  'transactionDetailFlyoutRedMetricsChart-failedTransactionRate',
];

const getChildTestSubjects = (element: HTMLElement) =>
  Array.from(element.children).map((child) => child.getAttribute('data-test-subj'));

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

    it('lays out latency, throughput and failed transaction rate in a single grid row', () => {
      render(<TransactionDetailFlyoutRedMetrics />);

      const grid = screen.getByTestId('transactionDetailFlyoutRedMetricsCharts');
      expect(grid).toHaveStyleRule('grid-template-columns', RED_METRICS_GRID_COLUMNS);
      expect(getChildTestSubjects(grid)).toEqual(API_CHART_PANEL_IDS);
    });

    it('renders the compact latency select on the latency title row', () => {
      render(<TransactionDetailFlyoutRedMetrics />);

      const latencyHeader = screen.getByTestId(
        'transactionDetailFlyoutRedMetricsChart-latency-header'
      );
      expect(within(latencyHeader).getByText('Latency')).toBeInTheDocument();
      expect(within(latencyHeader).getByTestId('apmLatencyChartSelect')).toBeInTheDocument();
      expect(within(latencyHeader).getByRole('option', { name: 'Avg' })).toBeInTheDocument();
      expect(within(latencyHeader).queryByText('Metric')).not.toBeInTheDocument();
    });

    it('gives every chart header the same height so the plots stay aligned', () => {
      const {
        result: {
          current: { euiTheme },
        },
      } = renderHook(() => useEuiTheme());

      render(<TransactionDetailFlyoutRedMetrics />);

      API_CHART_PANEL_IDS.forEach((id) => {
        expect(screen.getByTestId(`${id}-header`)).toHaveStyleRule('min-height', euiTheme.size.xl);
      });
    });

    it('does not mirror tooltips onto the sibling charts in the narrow row', () => {
      render(<TransactionDetailFlyoutRedMetrics />);

      expect(mockTimeseriesChart).toHaveBeenCalledTimes(3);
      mockTimeseriesChart.mock.calls.forEach(([props]) => {
        expect(props).toEqual(
          expect.objectContaining({
            settings: { externalPointerEvents: { tooltip: { visible: false } } },
          })
        );
      });
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
        refreshToken: 42,
        preferDocumentBasedCharts: true,
        schema: 'ecs',
        indices: MOCK_INDICES,
      });

      render(<TransactionDetailFlyoutRedMetrics />);

      expect(screen.getByTestId('transactionDetailFlyoutEsqlRedMetrics')).toBeInTheDocument();
      expect(screen.getByTestId('transactionDetailFlyoutLensChart-latency')).toHaveAttribute(
        'data-refresh-token',
        '42'
      );
      expect(screen.getByTestId('transactionDetailFlyoutLensChart-latency')).toHaveAttribute(
        'data-range-from',
        FILTERS.start
      );
      expect(screen.getByTestId('transactionDetailFlyoutLensChart-latency')).toHaveAttribute(
        'data-range-to',
        FILTERS.end
      );
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

    it('lays out the Lens charts in a single grid row in the same order as the API path', () => {
      mockedUseTransactionDetailFlyoutContext.mockReturnValue({
        deps: { core: { uiSettings: { get: () => 'UTC' } }, lens: LENS, dataViews: DATA_VIEWS },
        filters: FILTERS,
        preferDocumentBasedCharts: true,
        schema: 'ecs',
        indices: MOCK_INDICES,
      });

      render(<TransactionDetailFlyoutRedMetrics />);

      const grid = screen.getByTestId('transactionDetailFlyoutEsqlRedMetrics');
      expect(grid).toHaveStyleRule('grid-template-columns', RED_METRICS_GRID_COLUMNS);
      expect(getChildTestSubjects(grid)).toEqual([
        'transactionDetailFlyoutLensChart-latency',
        'transactionDetailFlyoutLensChart-throughput',
        'transactionDetailFlyoutLensChart-failedTransactionRate',
      ]);
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
