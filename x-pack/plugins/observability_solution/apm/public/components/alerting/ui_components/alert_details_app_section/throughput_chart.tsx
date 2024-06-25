/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Theme } from '@elastic/charts';
import { BoolQuery } from '@kbn/es-query';
import {
  RecursivePartial,
  EuiFlexItem,
  EuiPanel,
  EuiFlexGroup,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ChartType, getTimeSeriesColor } from '../../../shared/charts/helper/get_timeseries_color';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { ApmDocumentType } from '../../../../../common/document_type';
import { asExactTransactionRate } from '../../../../../common/utils/formatters';
import { TransactionTypeSelect } from './transaction_type_select';
import { ViewInAPMButton } from './view_in_apm_button';

const INITIAL_STATE = {
  currentPeriod: [],
  previousPeriod: [],
};
function ThroughputChart({
  transactionType,
  transactionTypes,
  setTransactionType,
  transactionName,
  serviceName,
  environment,
  start,
  end,
  comparisonChartTheme,
  comparisonEnabled,
  offset,
  timeZone,
  kuery = '',
  filters,
}: {
  transactionType: string;
  transactionTypes?: string[];
  setTransactionType?: (transactionType: string) => void;
  transactionName?: string;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  comparisonChartTheme: RecursivePartial<Theme>;
  comparisonEnabled: boolean;
  offset: string;
  timeZone: string;
  kuery?: string;
  filters?: BoolQuery;
}) {
  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    numBuckets: 100,
    kuery,
    type: transactionName
      ? ApmDocumentType.TransactionMetric
      : ApmDocumentType.ServiceTransactionMetric,
  });

  const { data: dataThroughput = INITIAL_STATE, status: statusThroughput } = useFetcher(
    (callApmApi) => {
      if (serviceName && transactionType && start && end && preferred) {
        return callApmApi('GET /internal/apm/services/{serviceName}/throughput', {
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
        });
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
  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(ChartType.THROUGHPUT);
  const timeseriesThroughput = [
    {
      data: dataThroughput.currentPeriod,
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
        defaultMessage: 'Throughput',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: dataThroughput.previousPeriod,
            type: 'area',
            color: previousPeriodColor,
            title: '',
          },
        ]
      : []),
  ];

  const showTransactionTypeSelect = setTransactionType && transactionTypes;

  return (
    <EuiFlexItem>
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
                  defaultMessage: 'Throughput',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate('xpack.apm.serviceOverview.tpmHelp', {
                defaultMessage: 'Throughput is measured in transactions per minute (tpm).',
              })}
              position="right"
            />
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

        <TimeseriesChart
          id="throughput"
          height={200}
          comparisonEnabled={comparisonEnabled}
          offset={offset}
          fetchStatus={statusThroughput}
          customTheme={comparisonChartTheme}
          timeseries={timeseriesThroughput}
          yLabelFormat={asExactTransactionRate}
          timeZone={timeZone}
        />
      </EuiPanel>
    </EuiFlexItem>
  );
}

// eslint-disable-next-line import/no-default-export
export default ThroughputChart;
