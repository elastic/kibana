/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip, EuiSpacer } from '@elastic/eui';
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
import { CHART_HEIGHT, ChartPanel, HIDE_LEGEND_SETTINGS, useChartsGridCss } from '../chart_panel';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { useRequestFlyoutRedMetrics } from './use_request_flyout_red_metrics';

const CHARTS_LOAD_ERROR = i18n.translate('xpack.apm.requestFlyout.chartsUnavailable', {
  defaultMessage: 'Unable to load charts',
});

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

  const { latencyTimeseries, throughputTimeseries, errorRateTimeseries, status, hasError } =
    useRequestFlyoutRedMetrics({ latencyAggregationType });

  const latencyMaxY = getMaxY(latencyTimeseries);
  const latencyFormatter = getDurationFormatter(latencyMaxY);

  return (
    <ChartPointerEventContextProvider>
      {hasError && (
        <>
          <KbnWarningCallout
            size="s"
            data-test-subj="requestFlyoutRedMetricsError"
            title={CHARTS_LOAD_ERROR}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <div css={chartsGridCss}>
        <ChartPanel
          id="requestFlyoutRedMetricsChart-latency"
          title={i18n.translate('xpack.apm.requestFlyout.latencyChartTitle', {
            defaultMessage: 'Latency',
          })}
          titleAction={
            <LatencyAggregationTypeSelect
              latencyAggregationType={latencyAggregationType}
              onChange={setLatencyAggregationType}
              ebt={{ element: REQUEST_FLYOUT_EBT_ELEMENTS.LATENCY_AGGREGATION }}
            />
          }
        >
          <TimeseriesChart
            settings={HIDE_LEGEND_SETTINGS}
            id="requestFlyoutLatencyChart"
            height={CHART_HEIGHT}
            fetchStatus={status}
            timeseries={latencyTimeseries}
            yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
          />
        </ChartPanel>

        <ChartPanel
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
            settings={HIDE_LEGEND_SETTINGS}
            id="requestFlyoutThroughputChart"
            height={CHART_HEIGHT}
            fetchStatus={status}
            timeseries={throughputTimeseries}
            yLabelFormat={asExactTransactionRate}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
          />
        </ChartPanel>

        <ChartPanel
          id="requestFlyoutRedMetricsChart-failedTransactionRate"
          title={i18n.translate('xpack.apm.requestFlyout.errorRateChartTitle', {
            defaultMessage: 'Failed transaction rate',
          })}
          titleTip={<EuiIconTip content={errorRateI18n} position="right" />}
        >
          <TimeseriesChart
            settings={HIDE_LEGEND_SETTINGS}
            id="requestFlyoutErrorRateChart"
            height={CHART_HEIGHT}
            fetchStatus={status}
            timeseries={errorRateTimeseries}
            yLabelFormat={yLabelFormatErrorRate}
            yDomain={{ min: 0, max: 1 }}
            comparisonEnabled={false}
            timeZone={timeZone}
            showAnnotations={false}
          />
        </ChartPanel>
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
