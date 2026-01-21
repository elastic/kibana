/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Theme, RectAnnotation, LineAnnotation } from '@elastic/charts';
import type { RecursivePartial } from '@elastic/eui';
import type { ReactElement } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexItem, EuiPanel, EuiFlexGroup, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoolQuery } from '@kbn/es-query';
import { getDurationFormatter } from '@kbn/observability-plugin/common';
import type { TopAlert } from '@kbn/observability-plugin/public';
import { filterNil } from '../../../shared/charts/latency_chart';
import { LatencyAggregationTypeSelect } from '../../../shared/charts/latency_chart/latency_aggregation_type_select';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../../shared/charts/transaction_charts/helper';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { getLatencyChartSelector } from '../../../../selectors/latency_chart_selectors';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { ApmDocumentType } from '../../../../../common/document_type';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { CHART_SETTINGS } from './constants';
import { TransactionTypeSelect } from './transaction_type_select';
import { ViewInAPMButton } from './view_in_apm_button';

function LatencyChart({
  alert,
  transactionType,
  transactionTypes,
  transactionName,
  serviceName,
  environment,
  start,
  end,
  latencyAggregationType,
  setLatencyAggregationType,
  setTransactionType,
  comparisonChartTheme,
  comparisonEnabled,
  offset,
  timeZone,
  customAlertEvaluationThreshold,
  kuery = '',
  filters,
  threshold,
  annotations,
}: {
  alert: TopAlert;
  transactionType: string;
  transactionTypes?: string[];
  transactionName?: string;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  comparisonChartTheme: RecursivePartial<Theme>;
  latencyAggregationType: LatencyAggregationType;
  setLatencyAggregationType?: (value: LatencyAggregationType) => void;
  setTransactionType?: (value: string) => void;
  comparisonEnabled: boolean;
  offset: string;
  timeZone: string;
  customAlertEvaluationThreshold?: number;
  threshold?: ReactElement;
  kuery?: string;
  filters?: BoolQuery;
  annotations?: Array<ReactElement<typeof RectAnnotation | typeof LineAnnotation>>;
}) {
  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery: '',
    numBuckets: 100,
    type: transactionName
      ? ApmDocumentType.TransactionMetric
      : ApmDocumentType.ServiceTransactionMetric,
  });
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && transactionType && latencyAggregationType && preferred) {
        return callApmApi(`GET /internal/apm/services/{serviceName}/transactions/charts/latency`, {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              filters: filters ? JSON.stringify(filters) : undefined,
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
      filters,
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
  const showTransactionTypeSelect = transactionTypes && setTransactionType;
  return (
    <EuiFlexItem>
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.dependencyLatencyChart.chartTitle', {
                  defaultMessage: 'Latency',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {setLatencyAggregationType && (
            <EuiFlexItem grow={false}>
              <LatencyAggregationTypeSelect
                latencyAggregationType={latencyAggregationType}
                onChange={setLatencyAggregationType}
              />
            </EuiFlexItem>
          )}
          {showTransactionTypeSelect && (
            <EuiFlexItem grow={false}>
              <TransactionTypeSelect
                transactionType={transactionType}
                transactionTypes={transactionTypes}
                onChange={setTransactionType}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <ViewInAPMButton
                  serviceName={serviceName}
                  environment={environment}
                  from={start}
                  to={end}
                  kuery={kuery}
                  transactionName={transactionName}
                  transactionType={transactionType}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
          {!!threshold && (
            <EuiFlexItem style={{ minWidth: 180 }} grow={1}>
              {threshold}
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={!!threshold ? 5 : undefined}>
            <TimeseriesChart
              id="latencyChart"
              annotations={annotations}
              height={200}
              comparisonEnabled={comparisonEnabled}
              offset={offset}
              fetchStatus={status}
              customTheme={comparisonChartTheme}
              timeseries={timeseriesLatency}
              yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
              timeZone={timeZone}
              settings={CHART_SETTINGS}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
}

// eslint-disable-next-line import/no-default-export
export default LatencyChart;
