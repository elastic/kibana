/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import {
  asExactTransactionRate,
  asPercent,
  getDurationFormatter,
} from '../../../../../common/utils/formatters';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { errorRateI18n } from '../../charts/failed_transaction_rate_chart';
import { getTimeZone } from '../../charts/helper/timezone';
import { LatencyAggregationTypeSelect } from '../../charts/latency_chart/latency_aggregation_type_select';
import { TimeseriesChart } from '../../charts/timeseries_chart';
import { getMaxY, getResponseTimeTickFormatter } from '../../charts/transaction_charts/helper';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { useRequestFlyoutRedMetrics } from './use_request_flyout_red_metrics';

const CHART_HEIGHT = 200;

const CHARTS_LOAD_ERROR = i18n.translate('xpack.apm.requestFlyout.chartsUnavailable', {
  defaultMessage: 'Unable to load charts',
});

function useChartsGridCss() {
  const { euiTheme } = useEuiTheme();

  return css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: ${euiTheme.size.m};
  `;
}

function RedMetricsChartsSkeleton() {
  const chartsGridCss = useChartsGridCss();

  return (
    <div data-test-subj="requestFlyoutRedMetricsSkeleton" css={chartsGridCss}>
      <EuiSkeletonRectangle width="100%" height={CHART_HEIGHT} borderRadius="m" />
      <EuiSkeletonRectangle width="100%" height={CHART_HEIGHT} borderRadius="m" />
      <EuiSkeletonRectangle width="100%" height={CHART_HEIGHT} borderRadius="m" />
    </div>
  );
}

function FlyoutTimeseriesChartPanel({
  id,
  title,
  titleAction,
  titleTip,
  children,
}: {
  id: string;
  title: string;
  titleAction?: React.ReactNode;
  titleTip?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj={id}
      css={css`
        min-height: ${CHART_HEIGHT}px;
        min-width: 0;
      `}
    >
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.m} 0;
        `}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          {titleTip ? <EuiFlexItem grow={false}>{titleTip}</EuiFlexItem> : null}
        </EuiFlexGroup>
        {titleAction ? (
          <>
            <EuiSpacer size="xs" />
            {titleAction}
          </>
        ) : null}
      </div>
      <div
        css={css`
          height: ${CHART_HEIGHT}px;
        `}
      >
        {children}
      </div>
    </EuiPanel>
  );
}

function yLabelFormatErrorRate(y?: number | null) {
  return asPercent(y || 0, 1);
}

function RequestFlyoutRedMetricsCharts({
  latencyAggregationType,
  setLatencyAggregationType,
}: {
  latencyAggregationType: LatencyAggregationType;
  setLatencyAggregationType: (value: LatencyAggregationType) => void;
}) {
  const {
    deps: { core },
  } = useRequestFlyoutContext();
  const timeZone = getTimeZone(core.uiSettings);
  const chartsGridCss = useChartsGridCss();

  const {
    latencyTimeseries,
    latencyStatus,
    throughputTimeseries,
    throughputStatus,
    errorRateTimeseries,
    errorRateStatus,
    isLoading,
    hasError,
  } = useRequestFlyoutRedMetrics({ latencyAggregationType });

  const latencyMaxY = getMaxY(latencyTimeseries);
  const latencyFormatter = getDurationFormatter(latencyMaxY);

  if (isLoading) {
    return <RedMetricsChartsSkeleton />;
  }

  if (hasError) {
    return (
      <KbnWarningCallout
        size="s"
        data-test-subj="requestFlyoutRedMetricsError"
        title={CHARTS_LOAD_ERROR}
      />
    );
  }

  return (
    <ChartPointerEventContextProvider>
      <div css={chartsGridCss}>
        <FlyoutTimeseriesChartPanel
          id="requestFlyoutRedMetricsChart-latency"
          title={i18n.translate('xpack.apm.requestFlyout.latencyChartTitle', {
            defaultMessage: 'Latency',
          })}
          titleAction={
            <LatencyAggregationTypeSelect
              latencyAggregationType={latencyAggregationType}
              onChange={setLatencyAggregationType}
            />
          }
        >
          <TimeseriesChart
            id="requestFlyoutLatencyChart"
            height={CHART_HEIGHT}
            fetchStatus={latencyStatus}
            timeseries={latencyTimeseries}
            yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
          />
        </FlyoutTimeseriesChartPanel>

        <FlyoutTimeseriesChartPanel
          id="requestFlyoutRedMetricsChart-throughput"
          title={i18n.translate('xpack.apm.requestFlyout.throughputChartTitle', {
            defaultMessage: 'Throughput',
          })}
          titleTip={
            <EuiIconTip
              content={i18n.translate('xpack.apm.requestFlyout.throughputHelp', {
                defaultMessage: 'Throughput is measured in spans per minute (spm).',
              })}
              position="right"
            />
          }
        >
          <TimeseriesChart
            id="requestFlyoutThroughputChart"
            height={CHART_HEIGHT}
            fetchStatus={throughputStatus}
            timeseries={throughputTimeseries}
            yLabelFormat={asExactTransactionRate}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
          />
        </FlyoutTimeseriesChartPanel>

        <FlyoutTimeseriesChartPanel
          id="requestFlyoutRedMetricsChart-failedTransactionRate"
          title={i18n.translate('xpack.apm.requestFlyout.errorRateChartTitle', {
            defaultMessage: 'Failed transaction rate',
          })}
          titleTip={<EuiIconTip content={errorRateI18n} position="right" />}
        >
          <TimeseriesChart
            id="requestFlyoutErrorRateChart"
            height={CHART_HEIGHT}
            fetchStatus={errorRateStatus}
            timeseries={errorRateTimeseries}
            yLabelFormat={yLabelFormatErrorRate}
            yDomain={{ min: 0, max: 1 }}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
          />
        </FlyoutTimeseriesChartPanel>
      </div>
    </ChartPointerEventContextProvider>
  );
}

export function RequestFlyoutRedMetrics({
  latencyAggregationType,
  setLatencyAggregationType,
}: {
  latencyAggregationType: LatencyAggregationType;
  setLatencyAggregationType: (value: LatencyAggregationType) => void;
}) {
  return (
    <section data-test-subj="requestFlyoutSection-redMetrics">
      <RequestFlyoutRedMetricsCharts
        latencyAggregationType={latencyAggregationType}
        setLatencyAggregationType={setLatencyAggregationType}
      />
    </section>
  );
}
