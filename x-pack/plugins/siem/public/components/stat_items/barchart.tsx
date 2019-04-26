import React from 'react';
import {
  // @ts-ignore
  EuiSeriesChartUtils
} from '@elastic/eui';
import { pure } from 'recompose';
import { BarChartData } from '.';
import { EuiSeriesChart, EuiBarSeries } from '@elastic/eui/lib/experimental';
const { SCALE, ORIENTATION } = EuiSeriesChartUtils;

export const BarChart = pure<{barChart: BarChartData[]}>(({barChart}) => (
  <EuiSeriesChart showDefaultAxis={true} height={100} yType={SCALE.ORDINAL} orientation={ORIENTATION.HORIZONTAL}>
    {
      barChart.map(series => series.value != null ? (
        <EuiBarSeries key={`stat-items-barchart-${series.key}`} 
          name={`stat-items-barchart-${series.key}`}
          data={series.value}
          color={series.color} />
      ) : null)
    }
  </EuiSeriesChart>
));
