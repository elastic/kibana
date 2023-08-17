/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  LineAnnotation,
  Position,
} from '@elastic/charts';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { convertTo } from '@kbn/observability-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import moment from 'moment';
import React, { useMemo } from 'react';
import { useAlertsHistory } from '@kbn/observability-alert-details';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmDocumentType } from '../../../../../common/document_type';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { getLatencyChartSelector } from '../../../../selectors/latency_chart_selectors';
import { filterNil } from '../../../shared/charts/latency_chart';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../../shared/charts/transaction_charts/helper';
import { CHART_ANNOTATION_RED_COLOR } from './constants';

interface LatencyAlertsHistoryChartProps {
  serviceName: string;
  start: string;
  end: string;
  transactionType?: string;
  latencyAggregationType: LatencyAggregationType;
  environment: string;
  timeZone: string;
  ruleId: string;
}
export function LatencyAlertsHistoryChart({
  serviceName,
  start,
  end,
  transactionType,
  latencyAggregationType,
  environment,
  timeZone,
  ruleId,
}: LatencyAlertsHistoryChartProps) {
  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery: '',
    numBuckets: 100,
    type: ApmDocumentType.ServiceTransactionMetric,
  });
  const { http, notifications } = useKibana().services;
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
                transactionName: undefined,
                latencyAggregationType,
                bucketSizeInSeconds: preferred.bucketSizeInSeconds,
                documentType: preferred.source.documentType,
                rollupInterval: preferred.source.rollupInterval,
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
      preferred,
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

  const { currentPeriod, previousPeriod } = memoizedData;
  const timeseriesLatency = [currentPeriod, previousPeriod].filter(filterNil);
  const latencyMaxY = getMaxY(timeseriesLatency);
  const latencyFormatter = getDurationFormatter(latencyMaxY);
  const {
    data: {
      totalTriggeredAlerts,
      avgTimeToRecoverUS,
      histogramTriggeredAlerts,
    },
    isError,
    isLoading,
  } = useAlertsHistory({
    http,
    featureIds: [AlertConsumers.APM],
    ruleId,
    dateRange: { from: start, to: end },
  });

  if (isError) {
    notifications?.toasts.addDanger({
      title: i18n.translate(
        'xpack.apm.alertDetails.latencyAlertHistoryChart.error.toastTitle',
        {
          defaultMessage: 'Latency alerts history chart error',
        }
      ),
      text: i18n.translate(
        'xpack.apm.alertDetails.latencyAlertHistoryChart.error.toastDescription',
        {
          defaultMessage: `An error occurred when fetching latency alert history chart data for {serviceName}`,
          values: { serviceName },
        }
      ),
    });
  }

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {serviceName}
              {i18n.translate('xpack.apm.latencyChartHistory.chartTitle', {
                defaultMessage: ' latency alerts history',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.apm.latencyChartHistory.last30days', {
              defaultMessage: 'Last 30 days',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem grow={false}>
              <EuiText color="danger">
                <EuiTitle size="s">
                  <h3>
                    {isLoading ? (
                      <EuiLoadingSpinner size="s" />
                    ) : (
                      totalTriggeredAlerts || '-'
                    )}
                  </h3>
                </EuiTitle>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.apm.latencyChartHistory.alertsTriggered',
                  {
                    defaultMessage: 'Alerts triggered',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiTitle size="s">
                <h3>
                  {isLoading ? (
                    <EuiLoadingSpinner size="s" />
                  ) : avgTimeToRecoverUS ? (
                    convertTo({
                      unit: 'minutes',
                      microseconds: avgTimeToRecoverUS,
                      extended: true,
                    }).formatted
                  ) : (
                    '-'
                  )}
                </h3>
              </EuiTitle>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.apm.latencyChartHistory.avgTimeToRecover',
                {
                  defaultMessage: 'Avg time to recover',
                }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <TimeseriesChart
        id="latencyChart"
        annotations={[
          <LineAnnotation
            id="annotations"
            key={'annotationsAlertHistory'}
            domainType={AnnotationDomainType.XDomain}
            dataValues={
              histogramTriggeredAlerts
                ?.filter((annotation) => annotation.doc_count > 0)
                .map((annotation) => {
                  return {
                    dataValue: annotation.key,
                    header: String(annotation.doc_count),
                    details: moment(annotation.key_as_string).format(
                      'yyyy-MM-DD'
                    ),
                  };
                }) || []
            }
            style={{
              line: {
                strokeWidth: 3,
                stroke: CHART_ANNOTATION_RED_COLOR,
                opacity: 1,
              },
            }}
            marker={
              <EuiIcon type="warning" color={CHART_ANNOTATION_RED_COLOR} />
            }
            markerBody={(annotationData) => (
              <>
                <EuiBadge color={CHART_ANNOTATION_RED_COLOR}>
                  <EuiText size="xs" color="white">
                    {annotationData.header}
                  </EuiText>
                </EuiBadge>
                <EuiSpacer size="xs" />
              </>
            )}
            markerPosition={Position.Top}
          />,
        ]}
        height={200}
        comparisonEnabled={false}
        offset={''}
        fetchStatus={status}
        timeseries={timeseriesLatency}
        yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
        timeZone={timeZone}
      />
    </EuiPanel>
  );
}
