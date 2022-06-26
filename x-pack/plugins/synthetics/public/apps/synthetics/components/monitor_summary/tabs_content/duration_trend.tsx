/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Chart,
  Settings,
  Axis,
  AreaSeries,
  Position,
  ScaleType,
  CurveType,
  LineSeries,
  timeFormatter,
  niceTimeFormatByDay,
} from '@elastic/charts';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useDurationRange } from '../hooks/use_duration_range';

const dateFormatter = timeFormatter(niceTimeFormatByDay(3));

export const MonitorDurationTrend = () => {
  const { timeSeries, loading } = useDurationRange();

  if (loading) {
    return <EuiLoadingSpinner />;
  }

  const percentiles = ['25th', '50th', '75th', '95th'];

  return (
    <Chart>
      <Settings showLegend showLegendExtra legendPosition={Position.Right} />
      <Axis
        id="bottom"
        title="@timestamp"
        position={Position.Bottom}
        showOverlappingTicks
        showGridLines={true}
        tickFormat={dateFormatter}
        style={{
          axisTitle: {
            visible: false,
          },
        }}
      />
      <Axis
        id="left"
        domain={{
          min: 0,
          max: NaN,
          fit: true,
        }}
        title={'Duration'}
        position={Position.Left}
        tickFormat={(d) => Number(d).toFixed(0)}
        labelFormat={(d) => Number(d).toFixed(0) + ' ms'}
        showGridLines={true}
        ticks={5}
      />

      <AreaSeries
        id="Duration"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['max']}
        y0Accessors={['min']}
        data={timeSeries}
        curve={CurveType.CURVE_MONOTONE_X}
        tickFormat={(d) => Number(d).toFixed(0) + ' ms'}
        areaSeriesStyle={{
          area: {
            opacity: 0.8,
          },
        }}
        color={'#D7E1DF'}
      />

      {percentiles.map((per) => (
        <LineSeries
          id={`${per} Percentile`}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={[per]}
          data={timeSeries}
          curve={CurveType.CURVE_MONOTONE_X}
          tickFormat={(d) => Number(d).toFixed(0) + ' ms'}
          lineSeriesStyle={{
            point: {
              visible: false,
            },
            line: {
              strokeWidth: 3,
            },
          }}
        />
      ))}
    </Chart>
  );
};
