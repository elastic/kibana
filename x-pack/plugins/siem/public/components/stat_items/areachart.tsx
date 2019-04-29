import React from 'react';
import { pure } from 'recompose';
import { AreaChartData, WrappedByAutoSizer, ChartOverlay } from '.';
import { EuiSeriesChart, EuiAreaSeries } from '@elastic/eui/lib/experimental';
import { AutoSizer } from '../auto_sizer';


const ChartBaseComponent = pure<{ data: AreaChartData[], width: number | undefined, height: number | undefined }>(
  ({ data, ...chartConfigs }) => chartConfigs.width && chartConfigs.height ? (
    <EuiSeriesChart showDefaultAxis={false} {...chartConfigs} >
      {
        data.map(series => series.value != null ? (
        /**
         * Placing ts-ignore here for fillOpacity
         * */
        // @ts-ignore
        <EuiAreaSeries key={`stat-items-areachart-${series.key}`} 
          name={`stat-items-areachart-${series.key}`}
          data={series.value}
          fillOpacity={0.04}
          color={series.color}
            />
      ) : null)}
    </EuiSeriesChart>
  ) : null );


export const AreaChart = pure<{areaChart: AreaChartData[]}>(
  ({ areaChart }) => (
    <AutoSizer detectAnyWindowResize={false} content>
      {({ measureRef, content: { height, width } }) => (
        <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" innerRef={measureRef}>
          <ChartBaseComponent height={height} width={width} data={areaChart} />
          <ChartOverlay />
        </WrappedByAutoSizer>
      )}
    </AutoSizer>
  )
);

