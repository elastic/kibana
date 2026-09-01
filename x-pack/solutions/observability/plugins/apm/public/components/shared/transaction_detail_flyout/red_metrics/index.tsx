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
import React, { useState } from 'react';
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
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';
import { useTransactionDetailFlyoutRedMetricsCharts } from './use_transaction_detail_flyout_red_metrics_charts';

const CHART_HEIGHT = 200;

const CHARTS_LOAD_ERROR = i18n.translate('xpack.apm.transactionDetailFlyout.chartsUnavailable', {
  defaultMessage: 'Unable to load charts',
});

function RedMetricsChartsSkeleton() {
  const { euiTheme } = useEuiTheme();

  return (
    <div data-test-subj="transactionDetailFlyoutRedMetricsSkeleton">
      <EuiSkeletonRectangle width="30%" height={16} borderRadius="m" />
      <EuiSpacer size="s" />
      <EuiSkeletonRectangle width="100%" height={CHART_HEIGHT} borderRadius="m" />
      <EuiSpacer size="m" />
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: ${euiTheme.size.m};
        `}
      >
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

export function TransactionDetailFlyoutRedMetrics() {
  const [latencyAggregationType, setLatencyAggregationType] = useState(LatencyAggregationType.avg);
  const { euiTheme } = useEuiTheme();
  const {
    deps: { core },
    filters,
  } = useTransactionDetailFlyoutContext();
  const timeZone = getTimeZone(core.uiSettings);

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

  const secondaryChartsGridCss = css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${euiTheme.size.m};
  `;

  if (isLoading) {
    return (
      <section data-test-subj="transactionDetailFlyoutSection-redMetrics">
        <RedMetricsChartsSkeleton />
      </section>
    );
  }

  if (hasError) {
    return (
      <section data-test-subj="transactionDetailFlyoutSection-redMetrics">
        <KbnWarningCallout
          size="s"
          data-test-subj="transactionDetailFlyoutRedMetricsError"
          title={CHARTS_LOAD_ERROR}
        />
      </section>
    );
  }

  return (
    <section data-test-subj="transactionDetailFlyoutSection-redMetrics">
      <ChartPointerEventContextProvider>
        <FlyoutTimeseriesChartPanel
          id="transactionDetailFlyoutRedMetricsChart-latency"
          title={i18n.translate('xpack.apm.transactionDetailFlyout.latencyChartTitle', {
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
            id="transactionDetailFlyoutLatencyChart"
            height={CHART_HEIGHT}
            fetchStatus={latencyStatus}
            timeseries={latencyTimeseries}
            yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
          />
        </FlyoutTimeseriesChartPanel>

        <EuiSpacer size="m" />

        <div css={secondaryChartsGridCss}>
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
            />
          </FlyoutTimeseriesChartPanel>
        </div>
      </ChartPointerEventContextProvider>
    </section>
  );
}
