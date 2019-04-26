import React from 'react';
import { pure } from 'recompose';
import { AreaChartData } from '.';
import { EuiSeriesChart, EuiAreaSeries } from '@elastic/eui/lib/experimental';

export const AreaChart = pure<{areaChart: AreaChartData[]}>(({areaChart}) => (
  <EuiSeriesChart showDefaultAxis={true} height={100}>
    {
      areaChart.map(series => series.value != null ? (
        /**
         * Placing ts-ignore here for fillOpacity
         * */
        // @ts-ignore
        <EuiAreaSeries key={`stat-items-areachart-${series.key}`} 
          name={`stat-items-areachart-${series.key}`}
          data={series.value}
          fillOpacity={0.04}
          color={series.color} />
      ) : null)
    }
  </EuiSeriesChart>
));
