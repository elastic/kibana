/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RIGHT_ALIGNMENT, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ValuesType } from 'utility-types';
import { APIReturnType } from '../../../../../../services/rest/create_call_apm_api';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../../../shared/charts/helper/get_timeseries_color';
import { SparkPlot } from '../../../../../shared/charts/spark_plot';
import { isTimeComparison } from '../../../../../shared/time_comparison/get_comparison_options';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../../../common/utils/formatters';
import { ITableColumn } from '../../../../../shared/managed_table';

type MobileMainStatisticsByField =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/main_statistics'>;

type MobileMainStatisticsByFieldItem = ValuesType<MobileMainStatisticsByField['mainStatistics']>;

type MobileDetailedStatisticsByField =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/detailed_statistics'>;

export function getColumns({
  detailedStatisticsLoading,
  detailedStatistics,
  comparisonEnabled,
  offset,
}: {
  detailedStatisticsLoading: boolean;
  detailedStatistics: MobileDetailedStatisticsByField;
  comparisonEnabled?: boolean;
  offset?: string;
}): Array<ITableColumn<MobileMainStatisticsByFieldItem>> {
  return [
    // version/device
    {
      field: 'name',
      name: i18n.translate('xpack.apm.mobile.transactions.overview.table.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
    },
    // latency
    {
      field: 'latency',
      name: i18n.translate('xpack.apm.mobile.transactions.overview.table.latencyColumnAvgLabel', {
        defaultMessage: 'Latency (avg.)',
      }),
      align: RIGHT_ALIGNMENT,
      render: (_, { latency, name }) => {
        const currentPeriodTimeseries = detailedStatistics?.currentPeriod?.[name]?.latency;
        const previousPeriodTimeseries = detailedStatistics?.previousPeriod?.[name]?.latency;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.LATENCY_AVG
        );

        return (
          <SparkPlot
            color={currentPeriodColor}
            isLoading={detailedStatisticsLoading}
            series={currentPeriodTimeseries}
            valueLabel={asMillisecondDuration(latency)}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousPeriodTimeseries : undefined
            }
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    // throughput
    {
      field: 'throughput',
      name: i18n.translate(
        'xpack.apm.mobile.transactions.overview.table.throughputColumnAvgLabel',
        { defaultMessage: 'Throughput' }
      ),
      align: RIGHT_ALIGNMENT,
      render: (_, { throughput, name }) => {
        const currentPeriodTimeseries = detailedStatistics?.currentPeriod?.[name]?.throughput;
        const previousPeriodTimeseries = detailedStatistics?.previousPeriod?.[name]?.throughput;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.THROUGHPUT
        );

        return (
          <SparkPlot
            color={currentPeriodColor}
            isLoading={detailedStatisticsLoading}
            series={currentPeriodTimeseries}
            valueLabel={asTransactionRate(throughput)}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousPeriodTimeseries : undefined
            }
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    // crash rate
    {
      field: 'crashRate',
      name: i18n.translate('xpack.apm.mobile.transactions.overview.table.crashRateColumnLabel', {
        defaultMessage: 'Crash rate',
      }),
      align: RIGHT_ALIGNMENT,
      render: (_, { crashRate }) => {
        return (
          <EuiText size="s" textAlign="right">
            {asPercent(crashRate, 1)}
          </EuiText>
        );
      },
    },
  ];
}
