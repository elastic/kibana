/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AreaSeries, Chart, Fit, LineSeries, ScaleType, Settings } from '@elastic/charts';
import React from 'react';
import { EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { EUI_SPARKLINE_THEME_PARTIAL } from '@elastic/eui/dist/eui_charts_theme';
import { useKibana } from '../../../utils/kibana_react';

import { ObservabilityAppServices } from '../../../application/types';

interface Data {
  key: number;
  value: number | undefined;
}
type ChartType = 'area' | 'line';
type State = 'success' | 'error';

export interface Props {
  id: string;
  data: Data[];
  chart: ChartType;
  state: State;
  loading: boolean;
}

export function SloSparkline({ chart, data, id, loading, state }: Props) {
  const charts = useKibana<ObservabilityAppServices>().services.charts;
  const chartThemes = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };
  const { euiTheme } = useEuiTheme();

  const color = state === 'error' ? euiTheme.colors.danger : euiTheme.colors.success;
  const ChartComponent = chart === 'area' ? AreaSeries : LineSeries;

  if (loading) {
    return <EuiLoadingChart size="m" mono />;
  }

  return (
    <Chart size={{ height: 28, width: 80 }}>
      <Settings
        theme={[chartThemes.theme, EUI_SPARKLINE_THEME_PARTIAL]}
        baseTheme={chartThemes.baseTheme}
        showLegend={false}
        tooltip="none"
      />
      <ChartComponent
        id={id}
        data={data}
        fit={Fit.Nearest}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={'key'}
        yAccessors={['value']}
        color={color}
        timeZone="UTC"
        lineSeriesStyle={{
          line: {
            strokeWidth: 1,
          },
          point: { visible: false },
        }}
      />
    </Chart>
  );
}
