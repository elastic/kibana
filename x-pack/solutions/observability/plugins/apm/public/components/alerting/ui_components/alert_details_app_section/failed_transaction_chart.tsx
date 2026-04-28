/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* Error Rate */

import type { ReactElement } from 'react';
import React from 'react';
import type { RecursivePartial } from '@elastic/eui';
import { EuiFlexItem, EuiPanel, EuiFlexGroup, EuiTitle, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoolQuery } from '@kbn/es-query';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { Theme } from '@elastic/charts';
import type { TopAlert } from '@kbn/observability-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import { CHART_SETTINGS, DEFAULT_DATE_FORMAT, THRESHOLD_SIDEBAR_MIN_WIDTH } from './constants';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { ChartType, getTimeSeriesColor } from '../../../shared/charts/helper/get_timeseries_color';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { errorRateI18n } from '../../../shared/charts/failed_transaction_rate_chart';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import { yLabelFormat } from './helpers';
import { useGetChartAlertAnnotations } from './use_get_chart_alert_annotations';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { ApmDocumentType } from '../../../../../common/document_type';
import { TransactionTypeSelect } from './transaction_type_select';
import { RED_METRICS_CHART_ELEMENT, RedMetricsChartActions } from './red_metrics_chart_actions';

type ErrorRate =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate'>;

const INITIAL_STATE_ERROR_RATE: ErrorRate = {
  currentPeriod: {
    timeseries: [],
    average: null,
  },
  previousPeriod: {
    timeseries: [],
    average: null,
  },
};

export function FailedTransactionChart({
  alert,
  transactionType,
  transactionTypes,
  setTransactionType,
  transactionName,
  serviceName,
  environment,
  start,
  end,
  comparisonChartTheme,
  timeZone,
  comparisonEnabled,
  offset,
  kuery = '',
  filters,
  customAlertEvaluationThreshold,
  threshold,
  ruleTypeId,
}: {
  alert: TopAlert;
  transactionType?: string;
  transactionTypes?: string[];
  setTransactionType?: (transactionType: string) => void;
  transactionName?: string;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  comparisonChartTheme: RecursivePartial<Theme>;
  timeZone: string;
  comparisonEnabled: boolean;
  offset: string;
  kuery?: string;
  filters?: BoolQuery;
  customAlertEvaluationThreshold?: number;
  threshold?: ReactElement;
  ruleTypeId?: ApmRuleType;
}) {
  const {
    services: { uiSettings },
  } = useKibana();

  const { currentPeriodColor: currentPeriodColorErrorRate } = getTimeSeriesColor(
    ChartType.FAILED_TRANSACTION_RATE
  );

  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    numBuckets: 100,
    type: transactionName
      ? ApmDocumentType.TransactionMetric
      : ApmDocumentType.ServiceTransactionMetric,
  });

  const { data: dataErrorRate = INITIAL_STATE_ERROR_RATE, status } = useFetcher(
    (callApmApi) => {
      if (transactionType && serviceName && start && end && preferred) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
          {
            params: {
              path: {
                serviceName,
              },
              query: {
                environment,
                kuery,
                filters: filters ? JSON.stringify(filters) : undefined,
                start,
                end,
                transactionType,
                transactionName,
                documentType: preferred.source.documentType,
                rollupInterval: preferred.source.rollupInterval,
                bucketSizeInSeconds: preferred.bucketSizeInSeconds,
              },
            },
          }
        );
      }
    },
    [
      environment,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      preferred,
      kuery,
      filters,
    ]
  );

  const dateFormat = (uiSettings && uiSettings.get(UI_SETTINGS.DATE_FORMAT)) || DEFAULT_DATE_FORMAT;

  const alertAnnotations = useGetChartAlertAnnotations({
    alert,
    dateFormat,
    showAnnotations: !!threshold,
    customAlertEvaluationThreshold,
    normalizeThreshold: (value) => value / 100,
  });

  const timeseriesErrorRate = [
    {
      data: dataErrorRate.currentPeriod.timeseries,
      type: 'linemark',
      color: currentPeriodColorErrorRate,
      title: i18n.translate('xpack.apm.errorRate.chart.errorRate', {
        defaultMessage: 'Failed transaction rate (avg.)',
      }),
    },
  ];

  const showTransactionTypeSelect = transactionType && transactionTypes && setTransactionType;

  return (
    <EuiFlexItem>
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.errorRate', {
                  defaultMessage: 'Failed transaction rate',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip content={errorRateI18n} position="right" />
          </EuiFlexItem>
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
                <RedMetricsChartActions
                  queryParams={{
                    serviceName,
                    environment,
                    transactionName,
                    transactionType,
                    kuery,
                  }}
                  timeRange={{ from: start, to: end }}
                  ruleTypeId={ruleTypeId}
                  element={RED_METRICS_CHART_ELEMENT.FAILED_TRANSACTION_RATE}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="row" gutterSize="m">
          {!!threshold && (
            <EuiFlexItem style={{ minWidth: THRESHOLD_SIDEBAR_MIN_WIDTH }} grow={1}>
              {threshold}
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={!!threshold ? 5 : undefined}>
            <TimeseriesChart
              id="errorRate"
              height={200}
              showAnnotations={true}
              annotations={alertAnnotations}
              fetchStatus={status}
              timeseries={timeseriesErrorRate}
              yLabelFormat={yLabelFormat}
              yDomain={{ min: 0, max: 1 }}
              comparisonEnabled={comparisonEnabled}
              offset={offset}
              customTheme={comparisonChartTheme}
              timeZone={timeZone}
              settings={CHART_SETTINGS}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
}
