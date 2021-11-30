/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ALERT_RULE_TYPE_ID } from '../../../../../../rule_registry/common/technical_rule_data_field_names';
import { AlertType } from '../../../../../common/alert_types';
import { asPercent } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/use_theme';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { TimeseriesChart } from '../timeseries_chart';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { getComparisonChartTheme } from '../../time_comparison/get_time_range_comparison';

function yLabelFormat(y?: number | null) {
  return asPercent(y || 0, 1);
}

interface Props {
  errorRateTimeSeries: any;
  fetchStatus: FETCH_STATUS;
}

export function ErrorRateChart({ errorRateTimeSeries, fetchStatus }: Props) {
  const theme = useTheme();
  const {
    urlParams: { comparisonEnabled },
  } = useLegacyUrlParams();

  const { alerts } = useApmServiceContext();
  const comparisonChartThem = getComparisonChartTheme(theme);

  const timeseries = [
    {
      data: errorRateTimeSeries.errorRateCurrentPeriod,
      type: 'linemark',
      color: theme.eui.euiColorVis7,
      title: i18n.translate('xpack.apm.errorRate.chart.errorRate', {
        defaultMessage: 'Error rate (avg.)',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: errorRateTimeSeries.errorRatePreviousPeriod,
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
    <EuiPanel hasBorder={true}>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.apm.errorRate', {
            defaultMessage: 'Error rate',
          })}
        </h2>
      </EuiTitle>
      <TimeseriesChart
        id="errorRate"
        fetchStatus={fetchStatus}
        timeseries={timeseries}
        yLabelFormat={yLabelFormat}
        yDomain={{ min: 0, max: 1 }}
        customTheme={comparisonChartThem}
        alerts={alerts.filter(
          (alert) => alert[ALERT_RULE_TYPE_ID]?.[0] === AlertType.ErrorCount
        )}
      />
    </EuiPanel>
  );
}
