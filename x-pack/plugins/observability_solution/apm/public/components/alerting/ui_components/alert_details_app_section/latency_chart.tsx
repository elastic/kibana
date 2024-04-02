/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Theme } from '@elastic/charts';
import { RecursivePartial } from '@elastic/eui';
import React, { useMemo } from 'react';
import { EuiFlexItem, EuiPanel, EuiFlexGroup, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getDurationFormatter } from '@kbn/observability-plugin/common';
import {
  ALERT_RULE_TYPE_ID,
  ALERT_EVALUATION_THRESHOLD,
} from '@kbn/rule-data-utils';
import type { TopAlert } from '@kbn/observability-plugin/public';
import {
  AlertActiveTimeRangeAnnotation,
  AlertThresholdAnnotation,
  AlertThresholdTimeRangeRect,
  AlertAnnotation,
} from '@kbn/observability-alert-details';
import { useEuiTheme } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { filterNil } from '../../../shared/charts/latency_chart';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../../shared/charts/transaction_charts/helper';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { getLatencyChartSelector } from '../../../../selectors/latency_chart_selectors';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { isLatencyThresholdRuleType } from './helpers';
import { ApmDocumentType } from '../../../../../common/document_type';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { DEFAULT_DATE_FORMAT } from './constants';

function LatencyChart({
  alert,
  transactionType,
  transactionName,
  serviceName,
  environment,
  start,
  end,
  latencyAggregationType,
  comparisonChartTheme,
  comparisonEnabled,
  offset,
  timeZone,
}: {
  alert: TopAlert;
  transactionType: string;
  transactionName?: string;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  comparisonChartTheme: RecursivePartial<Theme>;
  latencyAggregationType: LatencyAggregationType;
  comparisonEnabled: boolean;
  offset: string;
  timeZone: string;
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
  const { euiTheme } = useEuiTheme();
  const {
    services: { uiSettings },
  } = useKibana();
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (
        serviceName &&
        start &&
        end &&
        transactionType &&
        latencyAggregationType &&
        preferred
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
          }
        );
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
    ]
  );
  const alertEvalThreshold = alert.fields[ALERT_EVALUATION_THRESHOLD];

  const alertEvalThresholdChartData = alertEvalThreshold
    ? [
        <AlertThresholdTimeRangeRect
          key={'alertThresholdRect'}
          id={'alertThresholdRect'}
          threshold={alertEvalThreshold}
          alertStarted={alert.start}
          color={euiTheme.colors.danger}
        />,
        <AlertThresholdAnnotation
          id={'alertThresholdAnnotation'}
          key={'alertThresholdAnnotation'}
          color={euiTheme.colors.danger}
          threshold={alertEvalThreshold}
        />,
      ]
    : [];

  const getLatencyChartAdditionalData = () => {
    if (isLatencyThresholdRuleType(alert.fields[ALERT_RULE_TYPE_ID])) {
      return [
        <AlertActiveTimeRangeAnnotation
          alertStart={alert.start}
          color={euiTheme.colors.danger}
          id={'alertActiveRect'}
          key={'alertActiveRect'}
        />,
        <AlertAnnotation
          key={'alertAnnotationStart'}
          id={'alertAnnotationStart'}
          alertStart={alert.start}
          color={euiTheme.colors.danger}
          dateFormat={
            (uiSettings && uiSettings.get(UI_SETTINGS.DATE_FORMAT)) ||
            DEFAULT_DATE_FORMAT
          }
        />,
        ...alertEvalThresholdChartData,
      ];
    }
  };
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
        </EuiFlexGroup>
        <TimeseriesChart
          id="latencyChart"
          annotations={getLatencyChartAdditionalData()}
          height={200}
          comparisonEnabled={comparisonEnabled}
          offset={offset}
          fetchStatus={status}
          customTheme={comparisonChartTheme}
          timeseries={timeseriesLatency}
          yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
          timeZone={timeZone}
        />
      </EuiPanel>
    </EuiFlexItem>
  );
}

// eslint-disable-next-line import/no-default-export
export default LatencyChart;
