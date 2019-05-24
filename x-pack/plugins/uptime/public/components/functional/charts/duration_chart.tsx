/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  DataSeriesColorsValues,
  getAxisId,
  getSpecId,
  LineSeries,
  Position,
  ScaleType,
  timeFormatter,
} from '@elastic/charts';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import React, { useContext } from 'react';
import {
  convertMicrosecondsToMilliseconds as microsToMillis,
  getChartDateLabel,
} from '../../../lib/helper';
import {
  MonitorDurationAreaPoint,
  MonitorDurationAveragePoint,
} from '../../../../common/graphql/types';
import { UptimeSettingsContext } from '../../../contexts';

interface DurationChartProps {
  /**
   * Timeseries data that is used to express a max/min area series
   * on the duration chart.
   */
  durationArea: MonitorDurationAreaPoint[];
  /**
   * Timeseries data that is used to express an average line series
   * on the duration chart.
   */
  durationLine: MonitorDurationAveragePoint[];
  /**
   * The color to be used for the average duration series.
   */
  meanColor: string;
  /**
   * The color to be used for the range duration series.
   */
  rangeColor: string;
}

/**
 * This chart is intended to visualize monitor duration performance over time to
 * the users in a helpful way. Its x-axis is based on a timeseries, the y-axis is in
 * milliseconds.
 * @param props The props required for this component to render properly
 */
export const DurationChart = ({
  durationArea,
  durationLine,
  meanColor,
  rangeColor,
}: DurationChartProps) => {
  const { absoluteStartDate, absoluteEndDate } = useContext(UptimeSettingsContext);
  // this id is used for the area chart representing the max/min of check durations
  const areaspecid = getSpecId('area');
  // defines a map for the color series for the max/min duration
  const areaseriescolormap = new Map<DataSeriesColorsValues, string>();
  areaseriescolormap.set(
    {
      colorValues: [],
      specId: areaspecid,
    },
    rangeColor
  );

  // this id is used for the line chart representing the average duration length
  const averageSpecid = getSpecId('average');
  // defines a map for the color series for the average duration line
  const averageseriescolormap = new Map<DataSeriesColorsValues, string>();
  averageseriescolormap.set(
    {
      colorValues: [],
      specId: averageSpecid,
    },
    meanColor
  );

  return (
    <React.Fragment>
      <EuiTitle size="xs">
        <h4>Monitor Duration ms</h4>
      </EuiTitle>
      <EuiPanel>
        <Chart className={'story-chart'}>
          <Axis
            id={getAxisId('bottom')}
            title={'timestamp'}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
          />
          <Axis
            domain={{ min: 0 }}
            id={getAxisId('left')}
            title="Duration ms"
            position={Position.Left}
            tickFormat={d => Number(d).toFixed(0)}
          />

          <AreaSeries
            customSeriesColors={areaseriescolormap}
            id={areaspecid}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor={'x'}
            yAccessors={['Max']}
            y0Accessors={['Min']}
            data={durationArea.map(({ x, yMin, yMax }) => ({
              x,
              Min: microsToMillis(yMin),
              Max: microsToMillis(yMax),
            }))}
            yScaleToDataExtent={false}
            curve={CurveType.CURVE_MONOTONE_X}
          />

          <LineSeries
            customSeriesColors={averageseriescolormap}
            id={averageSpecid}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor={0}
            yAccessors={[1]}
            data={durationLine.map(({ x, y }) => [x || 0, microsToMillis(y)])}
            yScaleToDataExtent={true}
            curve={CurveType.CURVE_MONOTONE_X}
          />
        </Chart>
      </EuiPanel>
    </React.Fragment>
  );
};
