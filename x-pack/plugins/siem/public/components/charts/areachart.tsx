/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  Axis,
  AreaSeries,
  Chart,
  getAxisId,
  getSpecId,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { getOr, get } from 'lodash/fp';
import {
  ChartConfigsData,
  ChartHolder,
  getSeriesStyle,
  WrappedByAutoSizer,
  getTheme,
  ChartSeriesConfigs,
  browserTimezone,
} from './common';
import { AutoSizer } from '../auto_sizer';

// custom series styles: https://ela.st/areachart-styling
const getSeriesLineStyle = (color: string | undefined) => {
  return color
    ? {
        area: {
          fill: color,
          opacity: 0.04,
          visible: true,
        },
        line: {
          stroke: color,
          strokeWidth: 1,
          visible: true,
        },
        border: {
          visible: false,
          strokeWidth: 1,
          stroke: color,
        },
        point: {
          visible: false,
          radius: 0.2,
          stroke: color,
          strokeWidth: 1,
          opacity: 1,
        },
      }
    : undefined;
};

// https://ela.st/multi-areaseries
export const AreaChartBaseComponent = React.memo<{
  data: ChartConfigsData[];
  width: number | null | undefined;
  height: number | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ data, ...chartConfigs }) => {
  const xTickFormatter = get('configs.axis.xTickFormatter', chartConfigs);
  const yTickFormatter = get('configs.axis.yTickFormatter', chartConfigs);
  const xAxisId = getAxisId(`group-${data[0].key}-x`);
  const yAxisId = getAxisId(`group-${data[0].key}-y`);

  return chartConfigs.width && chartConfigs.height ? (
    <div style={{ height: chartConfigs.height, width: chartConfigs.width, position: 'relative' }}>
      <Chart>
        <Settings theme={getTheme()} />
        {data.map(series => {
          const seriesKey = series.key;
          const seriesSpecId = getSpecId(seriesKey);
          return series.value != null ? (
            <AreaSeries
              id={seriesSpecId}
              key={seriesKey}
              name={series.key.replace('Histogram', '')}
              data={series.value}
              xScaleType={getOr(ScaleType.Linear, 'configs.series.xScaleType', chartConfigs)}
              yScaleType={getOr(ScaleType.Linear, 'configs.series.yScaleType', chartConfigs)}
              timeZone={browserTimezone}
              xAccessor="x"
              yAccessors={['y']}
              areaSeriesStyle={getSeriesLineStyle(series.color)}
              customSeriesColors={getSeriesStyle(seriesKey, series.color)}
            />
          ) : null;
        })}

        {xTickFormatter ? (
          <Axis
            id={xAxisId}
            position={Position.Bottom}
            showOverlappingTicks={false}
            tickFormat={xTickFormatter}
            tickSize={0}
          />
        ) : (
          <Axis id={xAxisId} position={Position.Bottom} showOverlappingTicks={false} tickSize={0} />
        )}

        {yTickFormatter ? (
          <Axis id={yAxisId} position={Position.Left} tickSize={0} tickFormat={yTickFormatter} />
        ) : (
          <Axis id={yAxisId} position={Position.Left} tickSize={0} />
        )}
      </Chart>
    </div>
  ) : null;
});

export const AreaChartWithCustomPrompt = React.memo<{
  data: ChartConfigsData[] | null | undefined;
  height: number | null | undefined;
  width: number | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ data, height, width, configs }) => {
  return data != null &&
    data.length &&
    data.every(
      ({ value }) =>
        value != null &&
        value.length > 0 &&
        value.every(chart => chart.x != null && chart.y != null)
    ) ? (
    <AreaChartBaseComponent height={height} width={width} data={data} configs={configs} />
  ) : (
    <ChartHolder />
  );
});

export const AreaChart = React.memo<{
  areaChart: ChartConfigsData[] | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ areaChart, configs }) => (
  <AutoSizer detectAnyWindowResize={false} content>
    {({ measureRef, content: { height, width } }) => (
      <WrappedByAutoSizer innerRef={measureRef}>
        <AreaChartWithCustomPrompt
          data={areaChart}
          height={height}
          width={width}
          configs={configs}
        />
      </WrappedByAutoSizer>
    )}
  </AutoSizer>
));
