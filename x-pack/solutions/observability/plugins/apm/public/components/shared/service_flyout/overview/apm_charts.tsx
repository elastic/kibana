/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import React, { useEffect, useMemo } from 'react';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { FailedTransactionChart } from '../../../alerting/ui_components/alert_details_app_section/failed_transaction_chart';
import { LatencyChart } from '../../../alerting/ui_components/alert_details_app_section/latency_chart';
import { ThroughputChart } from '../../../alerting/ui_components/alert_details_app_section/throughput_chart';
import { getTimeZone } from '../../charts/helper/timezone';
import { toQuery } from '../../links/url_helpers';
import { getComparisonChartTheme } from '../../time_comparison/get_comparison_chart_theme';
import { SERVICE_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useServiceFlyoutContext } from '../service_flyout_context';

/**
 * Renders the same latency / failed transaction rate / throughput charts as the
 * alert details page (and the alerting dashboard embeddables), so the flyout
 * numbers match those pages by construction: same components, same APM chart APIs.
 */
export function ServiceFlyoutApmCharts({
  latencyAggregationType,
  setLatencyAggregationType,
}: {
  latencyAggregationType: LatencyAggregationType;
  setLatencyAggregationType: (value: LatencyAggregationType) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const {
    deps: { core },
    service,
    filters: {
      environment,
      rangeFrom,
      rangeTo,
      transactionType,
      setRange,
      comparisonEnabled = false,
      offset = '',
    },
  } = useServiceFlyoutContext();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  // The flyout has no URL of its own, so brushing (which pushes rangeFrom/rangeTo
  // onto the chart's router history) goes through a memory history that is
  // translated into the flyout's local time range.
  const history = useMemo(() => createMemoryHistory(), []);
  useEffect(
    () =>
      history.listen((location) => {
        const { rangeFrom: nextRangeFrom, rangeTo: nextRangeTo } = toQuery(location.search);
        if (typeof nextRangeFrom === 'string' && typeof nextRangeTo === 'string') {
          setRange({ rangeFrom: nextRangeFrom, rangeTo: nextRangeTo });
        }
      }),
    [history, setRange]
  );

  const comparisonChartTheme = getComparisonChartTheme();
  const timeZone = getTimeZone(core.uiSettings);

  const commonProps = {
    serviceName: service.name,
    environment,
    start,
    end,
    transactionType,
    comparisonChartTheme,
    comparisonEnabled,
    offset,
    timeZone,
    showAlertAnnotations: false,
    showChartActions: false,
  };

  return (
    <Router history={history}>
      <ChartPointerEventContextProvider>
        <div
          data-test-subj="serviceFlyoutApmCharts"
          css={css`
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: ${euiTheme.size.m};
          `}
        >
          {/* Distinct chart ids: the flyout globally pushes the page charts' tooltip
              portals (latencyChart/throughput/errorRate) below the flyout, and the
              tooltip portal is named after the chart id — reusing those ids here
              would hide the flyout's own tooltips. */}
          <LatencyChart
            {...commonProps}
            chartId="serviceFlyoutLatencyChart"
            latencyAggregationType={latencyAggregationType}
            setLatencyAggregationType={setLatencyAggregationType}
            latencySelectEbt={{ element: SERVICE_FLYOUT_EBT_ELEMENTS.CHART_CONTROLS }}
          />
          <FailedTransactionChart {...commonProps} chartId="serviceFlyoutErrorRate" />
          <ThroughputChart {...commonProps} chartId="serviceFlyoutThroughput" />
        </div>
      </ChartPointerEventContextProvider>
    </Router>
  );
}
