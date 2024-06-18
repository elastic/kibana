/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { getDurationFormatter } from '@kbn/observability-plugin/common';
import { ApmDocumentType } from '../../../common/document_type';
import { Environment } from '../../../common/environment_rt';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { useFetcher } from '../../hooks/use_fetcher';
import { PreferredDataSourceAndBucketSize } from '../../hooks/use_preferred_data_source_and_bucket_size';
import { getLatencyChartSelector } from '../../selectors/latency_chart_selectors';
import { filterNil } from '../../components/shared/charts/latency_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../components/shared/charts/transaction_charts/helper';
import { getTimeZone } from '../../components/shared/charts/helper/timezone';
import { isTimeComparison } from '../../components/shared/time_comparison/get_comparison_options';
import { TimeseriesChart } from '../../components/shared/charts/timeseries_chart';
import { getComparisonChartTheme } from '../../components/shared/time_comparison/get_comparison_chart_theme';
import { useKibana } from '../../context/kibana_context/use_kibana';

export function InvestigateLatencyChart({
  start,
  end,
  serviceName,
  environment,
  kuery,
  transactionType,
  transactionName,
  latencyAggregationType,
  comparisonEnabled,
  offset,
  preferred,
}: {
  start: string;
  end: string;
  serviceName: string;
  environment: Environment;
  kuery: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  latencyAggregationType: LatencyAggregationType;
  comparisonEnabled: boolean;
  offset: string | undefined;
  preferred: PreferredDataSourceAndBucketSize<
    ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric
  >;
}) {
  const {
    services: { uiSettings },
  } = useKibana();

  const timeZone = getTimeZone(uiSettings);

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType && latencyAggregationType && preferred) {
        return callApmApi(`GET /internal/apm/services/{serviceName}/transactions/charts/latency`, {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              filters: undefined,
              start,
              end,
              transactionType,
              transactionName,
              latencyAggregationType,
              documentType: preferred.source.documentType,
              rollupInterval: preferred.source.rollupInterval,
              bucketSizeInSeconds: preferred.bucketSizeInSeconds,
              useDurationSummary:
                preferred.source.hasDurationSummaryField &&
                latencyAggregationType === LatencyAggregationType.avg,
            },
          },
        });
      }
    },
    [
      end,
      environment,
      latencyAggregationType,
      serviceName,
      start,
      transactionType,
      transactionName,
      preferred,
      kuery,
    ]
  );

  const memoizedData = useMemo(
    () =>
      getLatencyChartSelector({
        latencyChart: data,
        latencyAggregationType,
        previousPeriodLabel: '',
      }),
    [data, latencyAggregationType]
  );
  const { currentPeriod, previousPeriod } = memoizedData;

  const timeseriesLatency = [
    currentPeriod,
    comparisonEnabled && isTimeComparison(offset) ? previousPeriod : undefined,
  ].filter(filterNil);

  const latencyMaxY = getMaxY(timeseriesLatency);
  const latencyFormatter = getDurationFormatter(latencyMaxY);

  return (
    <TimeseriesChart
      id="latencyChart"
      height={200}
      comparisonEnabled={comparisonEnabled}
      offset={offset}
      fetchStatus={status}
      customTheme={getComparisonChartTheme()}
      timeseries={timeseriesLatency}
      yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
      timeZone={timeZone}
    />
  );
}
