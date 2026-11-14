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
import React, { useMemo, useState } from 'react';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
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
import { useProjectRouting } from '../../service_flyout/hooks/use_project_routing';
import { getEsqlKeyMetricCharts } from '../../service_flyout/overview/chart_configs';
import { FlyoutLensChart } from '../../service_flyout/overview/lens_chart';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';
import { useTransactionDetailFlyoutRedMetricsCharts } from './use_transaction_detail_flyout_red_metrics_charts';

const CHART_HEIGHT = 200;

// Keep the synced crosshair across the three charts, but don't mirror the tooltip onto
// sibling charts: the columns are too narrow for three tooltips side by side.
const FLYOUT_CHART_SETTINGS = {
  externalPointerEvents: { tooltip: { visible: false } },
} as const;

const CHARTS_LOAD_ERROR = i18n.translate('xpack.apm.transactionDetailFlyout.chartsUnavailable', {
  defaultMessage: 'Unable to load charts',
});

// Single row of RED charts like the service flyout. This flyout is narrower, so the
// columns and gap are smaller to keep all three charts (and their titles) on one row.
function useRedMetricsChartsGridCss() {
  const { euiTheme } = useEuiTheme();

  return css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: ${euiTheme.size.s};
  `;
}

function RedMetricsChartsSkeleton() {
  const chartsGridCss = useRedMetricsChartsGridCss();

  return (
    <div data-test-subj="transactionDetailFlyoutRedMetricsSkeleton">
      <EuiSkeletonRectangle width="30%" height={16} borderRadius="m" />
      <EuiSpacer size="s" />
      <div css={chartsGridCss}>
        <EuiSkeletonRectangle width="100%" height={CHART_HEIGHT} borderRadius="m" />
        <EuiSkeletonRectangle width="100%" height={CHART_HEIGHT} borderRadius="m" />
        <EuiSkeletonRectangle width="100%" height={CHART_HEIGHT} borderRadius="m" />
      </div>
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
        {/* Title and action share one row, and every header reserves the compressed
            action height, so panels with and without an action stay aligned. */}
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          data-test-subj={`${id}-header`}
          css={css`
            min-height: ${euiTheme.size.xl};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h4 css={{ whiteSpace: 'nowrap' }}>{title}</h4>
                </EuiTitle>
              </EuiFlexItem>
              {titleTip ? <EuiFlexItem grow={false}>{titleTip}</EuiFlexItem> : null}
            </EuiFlexGroup>
          </EuiFlexItem>
          {titleAction ? <EuiFlexItem grow={false}>{titleAction}</EuiFlexItem> : null}
        </EuiFlexGroup>
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

function TransactionDetailFlyoutApiRedMetrics({
  latencyAggregationType,
  setLatencyAggregationType,
}: {
  latencyAggregationType: LatencyAggregationType;
  setLatencyAggregationType: (value: LatencyAggregationType) => void;
}) {
  const {
    deps: { core },
    filters,
  } = useTransactionDetailFlyoutContext();
  const timeZone = getTimeZone(core.uiSettings);
  const chartsGridCss = useRedMetricsChartsGridCss();

  const {
    latencyTimeseries,
    latencyStatus,
    throughputTimeseries,
    throughputStatus,
    errorRateTimeseries,
    errorRateStatus,
    isLoading,
    hasError,
  } = useTransactionDetailFlyoutRedMetricsCharts({
    ...filters,
    latencyAggregationType,
  });

  const latencyMaxY = getMaxY(latencyTimeseries);
  const latencyFormatter = getDurationFormatter(latencyMaxY);

  if (isLoading) {
    return <RedMetricsChartsSkeleton />;
  }

  if (hasError) {
    return (
      <KbnWarningCallout
        size="s"
        data-test-subj="transactionDetailFlyoutRedMetricsError"
        title={CHARTS_LOAD_ERROR}
      />
    );
  }

  return (
    <ChartPointerEventContextProvider>
      <div css={chartsGridCss} data-test-subj="transactionDetailFlyoutRedMetricsCharts">
        <FlyoutTimeseriesChartPanel
          id="transactionDetailFlyoutRedMetricsChart-latency"
          title={i18n.translate('xpack.apm.transactionDetailFlyout.latencyChartTitle', {
            defaultMessage: 'Latency',
          })}
          titleAction={
            <LatencyAggregationTypeSelect
              latencyAggregationType={latencyAggregationType}
              onChange={setLatencyAggregationType}
              compact
            />
          }
        >
          <TimeseriesChart
            id="transactionDetailFlyoutLatencyChart"
            height={CHART_HEIGHT}
            fetchStatus={latencyStatus}
            timeseries={latencyTimeseries}
            yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
            settings={FLYOUT_CHART_SETTINGS}
          />
        </FlyoutTimeseriesChartPanel>

        <FlyoutTimeseriesChartPanel
          id="transactionDetailFlyoutRedMetricsChart-throughput"
          title={i18n.translate('xpack.apm.transactionDetailFlyout.throughputChartTitle', {
            defaultMessage: 'Throughput',
          })}
          titleTip={
            <EuiIconTip
              content={i18n.translate('xpack.apm.transactionDetailFlyout.throughputHelp', {
                defaultMessage: 'Throughput is measured in transactions per minute (tpm).',
              })}
              position="right"
            />
          }
        >
          <TimeseriesChart
            id="transactionDetailFlyoutThroughputChart"
            height={CHART_HEIGHT}
            fetchStatus={throughputStatus}
            timeseries={throughputTimeseries}
            yLabelFormat={asExactTransactionRate}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
            settings={FLYOUT_CHART_SETTINGS}
          />
        </FlyoutTimeseriesChartPanel>

        <FlyoutTimeseriesChartPanel
          id="transactionDetailFlyoutRedMetricsChart-failedTransactionRate"
          title={i18n.translate('xpack.apm.transactionDetailFlyout.errorRateChartTitle', {
            defaultMessage: 'Failed transaction rate',
          })}
          titleTip={<EuiIconTip content={errorRateI18n} position="right" />}
        >
          <TimeseriesChart
            id="transactionDetailFlyoutErrorRateChart"
            height={CHART_HEIGHT}
            fetchStatus={errorRateStatus}
            timeseries={errorRateTimeseries}
            yLabelFormat={yLabelFormatErrorRate}
            yDomain={{ min: 0, max: 1 }}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
            settings={FLYOUT_CHART_SETTINGS}
          />
        </FlyoutTimeseriesChartPanel>
      </div>
    </ChartPointerEventContextProvider>
  );
}

function TransactionDetailFlyoutEsqlRedMetrics({
  latencyAggregationType,
  setLatencyAggregationType,
}: {
  latencyAggregationType: LatencyAggregationType;
  setLatencyAggregationType: (value: LatencyAggregationType) => void;
}) {
  const {
    deps: { lens, dataViews },
    filters,
    schema,
    indices,
    refreshToken,
  } = useTransactionDetailFlyoutContext();
  const projectRouting = useProjectRouting();
  const chartsGridCss = useRedMetricsChartsGridCss();

  const charts = useMemo(
    () =>
      getEsqlKeyMetricCharts({
        indices: indices ?? undefined,
        schema,
        serviceName: filters.serviceName,
        environment: filters.environment,
        transactionType: filters.transactionType,
        transactionName: filters.transactionName,
        latencyAggregationType,
        latencyTitleAction: (
          <LatencyAggregationTypeSelect
            latencyAggregationType={latencyAggregationType}
            onChange={setLatencyAggregationType}
            compact
          />
        ),
        projectRouting,
      }),
    [
      indices,
      schema,
      filters.serviceName,
      filters.environment,
      filters.transactionType,
      filters.transactionName,
      latencyAggregationType,
      setLatencyAggregationType,
      projectRouting,
    ]
  );

  if (!lens || !dataViews) {
    return (
      <KbnWarningCallout
        size="s"
        data-test-subj="transactionDetailFlyoutRedMetricsError"
        title={CHARTS_LOAD_ERROR}
      />
    );
  }

  if (indices === undefined) {
    return <RedMetricsChartsSkeleton />;
  }

  if (indices === null) {
    return (
      <KbnWarningCallout
        size="s"
        data-test-subj="transactionDetailFlyoutRedMetricsError"
        title={CHARTS_LOAD_ERROR}
      />
    );
  }

  // Same layout as the API path: latency, throughput and failed rate in one row.
  const orderedCharts = ['latency', 'throughput', 'failedTransactionRate']
    .map((id) => charts.find((chart) => chart.id === id))
    .filter((chart): chart is (typeof charts)[number] => chart != null);

  const renderLensChart = (chart: (typeof charts)[number]) => (
    <FlyoutLensChart
      key={chart.id}
      deps={{ lens, dataViews }}
      id={chart.id}
      title={chart.title}
      titleAction={chart.titleAction}
      config={chart.config}
      rangeFrom={filters.start}
      rangeTo={filters.end}
      refreshToken={refreshToken}
      dataTestSubjPrefix="transactionDetailFlyoutLensChart"
      embeddableIdPrefix="transaction-detail-flyout"
      executionContextDescription="apm transaction detail flyout chart data"
      executionContextProfileId="transaction-detail-flyout"
    />
  );

  return (
    <div data-test-subj="transactionDetailFlyoutEsqlRedMetrics" css={chartsGridCss}>
      {orderedCharts.map(renderLensChart)}
    </div>
  );
}

export function TransactionDetailFlyoutRedMetrics() {
  const [latencyAggregationType, setLatencyAggregationType] = useState(LatencyAggregationType.avg);
  const { preferDocumentBasedCharts, schema } = useTransactionDetailFlyoutContext();

  // Same host/schema rule as the service flyout: document-based hosts (Discover)
  // and unprocessed OTel services use ES|QL; APM/alert hosts use rollup APIs.
  const useEsqlCharts = Boolean(preferDocumentBasedCharts) || schema === 'otel';

  return (
    <section data-test-subj="transactionDetailFlyoutSection-redMetrics">
      {useEsqlCharts ? (
        <TransactionDetailFlyoutEsqlRedMetrics
          latencyAggregationType={latencyAggregationType}
          setLatencyAggregationType={setLatencyAggregationType}
        />
      ) : (
        <TransactionDetailFlyoutApiRedMetrics
          latencyAggregationType={latencyAggregationType}
          setLatencyAggregationType={setLatencyAggregationType}
        />
      )}
    </section>
  );
}
