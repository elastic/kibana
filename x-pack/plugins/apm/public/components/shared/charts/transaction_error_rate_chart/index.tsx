/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useParams } from 'react-router-dom';
import { RULE_ID } from '../../../../../../rule_registry/common/technical_rule_data_field_names';
import { AlertType } from '../../../../../common/alert_types';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { asPercent } from '../../../../../common/utils/formatters';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { TimeseriesChart } from '../timeseries_chart';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import {
  getComparisonChartTheme,
  getTimeRangeComparison,
} from '../../time_comparison/get_time_range_comparison';

function yLabelFormat(y?: number | null) {
  return asPercent(y || 0, 1);
}

interface Props {
  height?: number;
  showAnnotations?: boolean;
}

type ErrorRate = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/charts/error_rate'>;

const INITIAL_STATE: ErrorRate = {
  currentPeriod: {
    noHits: true,
    transactionErrorRate: [],
    average: null,
  },
  previousPeriod: {
    noHits: true,
    transactionErrorRate: [],
    average: null,
  },
};

export function TransactionErrorRateChart({
  height,
  showAnnotations = true,
}: Props) {
  const theme = useTheme();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const {
    urlParams: {
      environment,
      kuery,
      start,
      end,
      transactionName,
      comparisonEnabled,
      comparisonType,
    },
  } = useUrlParams();
  const { transactionType, alerts } = useApmServiceContext();
  const comparisonChartThem = getComparisonChartTheme(theme);
  const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
    comparisonEnabled,
  });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (transactionType && serviceName && start && end) {
        return callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transactions/charts/error_rate',
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              transactionName,
              comparisonStart,
              comparisonEnd,
            },
          },
        });
      }
    },
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      comparisonStart,
      comparisonEnd,
    ]
  );

  const timeseries = [
    {
      data: data.currentPeriod.transactionErrorRate,
      type: 'linemark',
      color: theme.eui.euiColorVis7,
      title: i18n.translate('xpack.apm.errorRate.chart.errorRate', {
        defaultMessage: 'Error rate (avg.)',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: data.previousPeriod.transactionErrorRate,
            type: 'area',
            color: theme.eui.euiColorMediumShade,
            title: i18n.translate(
              'xpack.apm.errorRate.chart.errorRate.previousPeriodLabel',
              { defaultMessage: 'Previous period' }
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.apm.errorRate', {
            defaultMessage: 'Error rate',
          })}
        </h2>
      </EuiTitle>
      <TimeseriesChart
        id="errorRate"
        height={height}
        showAnnotations={showAnnotations}
        fetchStatus={status}
        timeseries={timeseries}
        yLabelFormat={yLabelFormat}
        yDomain={{ min: 0, max: 1 }}
        customTheme={comparisonChartThem}
        alerts={alerts.filter(
          (alert) => alert[RULE_ID]?.[0] === AlertType.TransactionErrorRate
        )}
      />
    </EuiPanel>
  );
}
