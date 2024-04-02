/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiTitle,
  EuiIconTip,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiProgress,
} from '@elastic/eui';
import React from 'react';
import { TimeseriesChartWithContext } from '../../../../../shared/charts/timeseries_chart_with_context';
import { useLegacyUrlParams } from '../../../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, isPending } from '../../../../../../hooks/use_fetcher';
import { usePreviousPeriodLabel } from '../../../../../../hooks/use_previous_period_text';
import { APIReturnType } from '../../../../../../services/rest/create_call_apm_api';
import { getComparisonChartTheme } from '../../../../../shared/time_comparison/get_comparison_chart_theme';

import {
  ChartType,
  getTimeSeriesColor,
} from '../../../../../shared/charts/helper/get_timeseries_color';

type ErrorDistributionAPIResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/distribution'>;

interface Props {
  fetchStatus: FETCH_STATUS;
  distribution?: ErrorDistributionAPIResponse;
  title: string;
  tip: string;
  height: number;
}

export function ErrorDistribution({
  distribution,
  title,
  tip,
  height,
  fetchStatus,
}: Props) {
  const { urlParams } = useLegacyUrlParams();
  const { comparisonEnabled } = urlParams;

  const previousPeriodLabel = usePreviousPeriodLabel();
  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
    ChartType.ERROR_OCCURRENCES
  );
  const timeseries = [
    {
      data: distribution?.currentPeriod ?? [],
      type: 'linemark',
      color: currentPeriodColor,
      title,
    },
    ...(comparisonEnabled
      ? [
          {
            data: distribution?.previousPeriod ?? [],
            type: 'area',
            color: previousPeriodColor,
            title: previousPeriodLabel,
          },
        ]
      : []),
  ];

  const comparisonChartTheme = getComparisonChartTheme();

  return (
    <EuiPanel hasBorder={true} style={{ position: 'relative' }}>
      {isPending(fetchStatus) && (
        <EuiProgress size="xs" color="accent" position="absolute" />
      )}
      <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tip} position="right" />
        </EuiFlexItem>
      </EuiFlexGroup>

      <TimeseriesChartWithContext
        id={title}
        height={height}
        showAnnotations={false}
        fetchStatus={fetchStatus}
        yLabelFormat={(value) => `${value}`}
        timeseries={timeseries}
        customTheme={comparisonChartTheme}
      />
    </EuiPanel>
  );
}
