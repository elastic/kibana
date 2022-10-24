/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { TopAlert } from '@kbn/observability-plugin/public/pages/alerts';
import { Rule, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { EuiFlexItem } from '@elastic/eui';
import { getDurationFormatter } from '../../../common/utils/formatters/duration';
import { ApmMlDetectorType } from '../../../common/anomaly_detection/apm_ml_detectors';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { useFetcher } from '../../hooks/use_fetcher';
import { useTimeRange } from '../../hooks/use_time_range';
import { isTimeComparison } from '../shared/time_comparison/get_comparison_options';
import { getComparisonChartTheme } from '../shared/time_comparison/get_comparison_chart_theme';
import { getLatencyChartSelector } from '../../selectors/latency_chart_selectors';
import { TimeseriesChart } from '../shared/charts/timeseries_chart';
import { filterNil } from '../shared/charts/latency_chart';
import { usePreferredServiceAnomalyTimeseries } from '../../hooks/use_preferred_service_anomaly_timeseries';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../shared/charts/transaction_charts/helper';
import { ChartPointerEventContextProvider } from '../../context/chart_pointer_event/chart_pointer_event_context';

export interface AlertDetailsAppSectionProps {
  alert: TopAlert;
  rule: Rule<RuleTypeParams>;
}
export function AlertDetailsAppSection({ rule }: AlertDetailsAppSectionProps) {
  const params = rule.params;
  const environment = String(params.environment);
  const latencyAggregationType =
    params.aggregationType as LatencyAggregationType;
  const serviceName = String(params.serviceName);
  const transactionType = String(params.transactionType);
  const comparisonEnabled = true;
  const offset = '1d';
  const rangeFrom = 'now-2h';
  const rangeTo = 'now';
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const comparisonChartTheme = getComparisonChartTheme();

  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (
        serviceName &&
        start &&
        end &&
        transactionType &&
        latencyAggregationType
      ) {
        return callApmApi(
          `GET /internal/apm/services/{serviceName}/transactions/charts/latency`,
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery: '',
                start,
                end,
                transactionType,
                transactionName: undefined,
                latencyAggregationType,
                offset:
                  comparisonEnabled && isTimeComparison(offset)
                    ? offset
                    : undefined,
              },
            },
          }
        );
      }
    },
    [
      comparisonEnabled,
      end,
      environment,
      latencyAggregationType,
      serviceName,
      start,
      transactionType,
    ]
  );

  const memoizedData = useMemo(
    () =>
      getLatencyChartSelector({
        latencyChart: data,
        latencyAggregationType,
        previousPeriodLabel: '',
      }),
    // It should only update when the data has changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  const preferredAnomalyTimeseries = usePreferredServiceAnomalyTimeseries(
    ApmMlDetectorType.txThroughput
  );

  const { currentPeriod, previousPeriod } = memoizedData;

  const anomalyTimeseriesColor = previousPeriod?.color as string;

  const timeseries = [
    currentPeriod,
    comparisonEnabled && isTimeComparison(offset) ? previousPeriod : undefined,
  ].filter(filterNil);
  const latencyMaxY = getMaxY(timeseries);
  const latencyFormatter = getDurationFormatter(latencyMaxY);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem />
      <EuiFlexItem>
        <ChartPointerEventContextProvider>
          <TimeseriesChart
            height={200}
            externalContext={true}
            comparisonEnabled={comparisonEnabled}
            offset={offset}
            fetchStatus={status}
            id="latencyChart"
            customTheme={comparisonChartTheme}
            timeseries={timeseries}
            yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
            anomalyTimeseries={
              preferredAnomalyTimeseries
                ? {
                    ...preferredAnomalyTimeseries,
                    color: anomalyTimeseriesColor,
                  }
                : undefined
            }
          />
        </ChartPointerEventContextProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
