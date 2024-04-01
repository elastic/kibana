/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* Error Rate */

import {
  EuiFlexItem,
  EuiPanel,
  EuiFlexGroup,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { RecursivePartial } from '@elastic/eui';
import { Theme } from '@elastic/charts';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { ChartType } from '../../../shared/charts/helper/get_timeseries_color';
import * as get_timeseries_color from '../../../shared/charts/helper/get_timeseries_color';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { errorRateI18n } from '../../../shared/charts/failed_transaction_rate_chart';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import { yLabelFormat } from './helpers';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { ApmDocumentType } from '../../../../../common/document_type';
import { TransactionTypeSelect } from './transaction_type_select';

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

function FailedTransactionChart({
  transactionType,
  setTransactionType,
  transactionName,
  serviceName,
  environment,
  start,
  end,
  comparisonChartTheme,
  timeZone,
}: {
  transactionType: string;
  setTransactionType?: (transactionType: string) => void;
  transactionName?: string;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  comparisonChartTheme: RecursivePartial<Theme>;
  timeZone: string;
}) {
  const { currentPeriodColor: currentPeriodColorErrorRate } =
    get_timeseries_color.getTimeSeriesColor(ChartType.FAILED_TRANSACTION_RATE);

  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery: '',
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
                kuery: '',
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
    ]
  );
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
          {setTransactionType && (
            <EuiFlexItem grow={false}>
              <TransactionTypeSelect
                transactionType={transactionType}
                setTransactionType={setTransactionType}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <TimeseriesChart
          id="errorRate"
          height={200}
          showAnnotations={false}
          fetchStatus={status}
          timeseries={timeseriesErrorRate}
          yLabelFormat={yLabelFormat}
          yDomain={{ min: 0, max: 1 }}
          comparisonEnabled={false}
          customTheme={comparisonChartTheme}
          timeZone={timeZone}
        />
      </EuiPanel>
    </EuiFlexItem>
  );
}

// eslint-disable-next-line import/no-default-export
export default FailedTransactionChart;
