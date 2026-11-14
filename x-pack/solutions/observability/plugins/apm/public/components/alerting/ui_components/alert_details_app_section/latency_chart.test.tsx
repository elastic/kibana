/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen, within } from '@testing-library/react';
import { useEuiFontSize } from '@elastic/eui';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { LatencyChart } from './latency_chart';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { uiSettings: { get: () => undefined } } }),
}));
jest.mock('../../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../../hooks/use_fetcher'),
  useFetcher: () => ({ data: undefined, status: 'success' }),
}));
jest.mock('../../../../hooks/use_preferred_data_source_and_bucket_size', () => ({
  usePreferredDataSourceAndBucketSize: () => undefined,
}));
jest.mock('./use_get_chart_alert_annotations', () => ({
  useGetChartAlertAnnotations: () => [],
}));
jest.mock('../../../shared/charts/timeseries_chart', () => ({
  TimeseriesChart: ({ id }: { id: string }) => <div data-test-subj={id} />,
}));

const getOptionLabels = (container: HTMLElement) =>
  Array.from(within(container).getByTestId('apmLatencyChartSelect').querySelectorAll('option')).map(
    (option) => option.textContent
  );

function renderLatencyChart({ compactHeader }: { compactHeader?: boolean } = {}) {
  return render(
    <LatencyChart
      serviceName="opbeans-java"
      environment="production"
      start="2026-01-01T00:00:00.000Z"
      end="2026-01-01T01:00:00.000Z"
      transactionType="request"
      comparisonChartTheme={{}}
      comparisonEnabled={false}
      offset=""
      timeZone="UTC"
      showChartActions={false}
      latencyAggregationType={LatencyAggregationType.avg}
      setLatencyAggregationType={jest.fn()}
      compactHeader={compactHeader}
    />
  );
}

describe('LatencyChart header', () => {
  it('keeps the full select and a wrapping header by default', () => {
    renderLatencyChart();

    const header = screen.getByTestId('apmLatencyChartHeader');
    expect(getOptionLabels(header)).toEqual(['Average', '95th percentile', '99th percentile']);
    expect(within(header).getByText('Metric')).toBeInTheDocument();
    expect(screen.getByTestId('apmLatencyChartSelectContainer')).not.toHaveStyleRule(
      'block-size',
      /.+/
    );
  });

  it('renders a compact select inline with the title when compactHeader is set', () => {
    renderLatencyChart({ compactHeader: true });

    const header = screen.getByTestId('apmLatencyChartHeader');
    expect(within(header).getByText('Latency')).toBeInTheDocument();
    expect(getOptionLabels(header)).toEqual(['Avg', 'p95th', 'p99th']);
    expect(within(header).queryByText('Metric')).not.toBeInTheDocument();
  });

  it('keeps the compact header as tall as a title-only header', () => {
    const {
      result: {
        current: { lineHeight: titleLineHeight },
      },
    } = renderHook(() => useEuiFontSize('m'));

    renderLatencyChart({ compactHeader: true });

    expect(screen.getByTestId('apmLatencyChartSelectContainer')).toHaveStyleRule(
      'block-size',
      String(titleLineHeight)
    );
  });
});
