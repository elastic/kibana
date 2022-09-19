/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { css } from '@emotion/react';

import { Chart, BarSeries, PartialTheme, ScaleType, Settings } from '@elastic/charts';
import { EuiLoadingChart, EuiTextColor } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import type { ChangePointHistogramItem } from '@kbn/ml-agg-utils';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useEuiTheme } from '../../hooks/use_eui_theme';

interface MiniHistogramProps {
  chartData?: ChangePointHistogramItem[];
  isLoading: boolean;
  label: string;
}

export const MiniHistogram: FC<MiniHistogramProps> = ({ chartData, isLoading, label }) => {
  const { charts } = useAiopsAppContext();

  const euiTheme = useEuiTheme();
  const defaultChartTheme = charts.theme.useChartsTheme();

  const miniHistogramChartTheme: PartialTheme = {
    chartMargins: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    chartPaddings: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    scales: {
      barsPadding: 0.1,
    },
    background: {
      color: 'transparent',
    },
  };

  const cssChartSize = css({
    width: '80px',
    height: euiTheme.euiSizeL,
    margin: '0px',
  });

  const cssCenter = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  if (isLoading) {
    return (
      <div css={[cssChartSize, cssCenter]}>
        <EuiLoadingChart mono />
      </div>
    );
  }

  if (!chartData) {
    return (
      <div css={[cssChartSize, cssCenter]}>
        <EuiTextColor color="subdued">
          <FormattedMessage id="xpack.aiops.miniHistogram.noDataLabel" defaultMessage="N/A" />
        </EuiTextColor>
      </div>
    );
  }

  return (
    <div css={cssChartSize}>
      <Chart>
        <Settings
          theme={[miniHistogramChartTheme, defaultChartTheme]}
          showLegend={false}
          tooltip="none"
        />
        <BarSeries
          id="doc_count_overall"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'key'}
          yAccessors={['doc_count_overall']}
          data={chartData}
          stackAccessors={[0]}
        />
        <BarSeries
          id={label}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'key'}
          yAccessors={['doc_count_change_point']}
          data={chartData}
          stackAccessors={[0]}
          color={['orange']}
        />
      </Chart>
    </div>
  );
};
