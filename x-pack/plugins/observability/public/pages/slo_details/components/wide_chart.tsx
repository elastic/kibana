/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  Fit,
  LineSeries,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import React from 'react';
import { EuiIcon, EuiLoadingChart, useEuiTheme } from '@elastic/eui';

import { useKibana } from '../../../utils/kibana_react';
import { toHighPrecisionPercentage } from '../helpers/number';

export interface Data {
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

export function WideChart({ chart, data, id, loading, state }: Props) {
  const charts = useKibana().services.charts;
  const theme = charts.theme.useChartsTheme();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const { euiTheme } = useEuiTheme();

  const color = state === 'error' ? euiTheme.colors.danger : euiTheme.colors.success;
  const ChartComponent = chart === 'area' ? AreaSeries : LineSeries;

  if (loading) {
    return <EuiLoadingChart size="m" mono />;
  }

  return (
    <Chart size={{ height: 150, width: '100%' }}>
      <Settings
        baseTheme={baseTheme}
        showLegend={false}
        theme={[theme]}
        tooltip="vertical"
        noResults={<EuiIcon type="visualizeApp" size="l" color="subdued" title="no results" />}
      />
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={(d) => new Date(d).toISOString()}
      />
      <Axis
        id="left"
        ticks={4}
        position={Position.Left}
        tickFormat={(d) => `${toHighPrecisionPercentage(d)}%`}
      />
      <ChartComponent
        color={color}
        data={data}
        fit={Fit.Nearest}
        id={id}
        lineSeriesStyle={{
          line: {
            strokeWidth: 1,
          },
          point: { visible: false },
        }}
        xAccessor={'key'}
        xScaleType={ScaleType.Time}
        yAccessors={['value']}
        yScaleType={ScaleType.Linear}
        yNice
      />
    </Chart>
  );
}
