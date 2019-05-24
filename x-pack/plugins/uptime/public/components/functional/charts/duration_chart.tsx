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
  getAxisId,
  getSpecId,
  LineSeries,
  Position,
  ScaleType,
  timeFormatter,
} from '@elastic/charts';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import {
  convertMicrosecondsToMilliseconds as microsToMillis,
  getChartDateLabel,
} from '../../../lib/helper';
import {
  MonitorDurationAreaPoint,
  MonitorDurationAveragePoint,
} from '../../../../common/graphql/types';
import { UptimeSettingsContext } from '../../../contexts';
import { getColorsMap } from './get_colors_map';

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
  const areaSpecId = getSpecId('area');
  const areaSeriesColorMap = getColorsMap(rangeColor, areaSpecId);

  // this id is used for the line chart representing the average duration length
  const averageSpecId = getSpecId('average');
  const averageSeriesColorMap = getColorsMap(meanColor, averageSpecId);

  return (
    <React.Fragment>
      <EuiTitle size="xs">
        <h4>Monitor Duration ms</h4>
      </EuiTitle>
      <EuiPanel>
        <Chart className={'story-chart'}>
          <Axis
            id={getAxisId('bottom')}
            title={i18n.translate('xpack.uptime.monitorCharts.checkStatus.bottomAxis.title', {
              defaultMessage: 'timestamp',
            })}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
          />
          <Axis
            domain={{ min: 0 }}
            id={getAxisId('left')}
            title={i18n.translate('xpack.uptime.monitorCharts.checkStatus.leftAxis.title', {
              defaultMessage: 'Duration ms',
            })}
            position={Position.Left}
            tickFormat={d => Number(d).toFixed(0)}
          />
          <AreaSeries
            customSeriesColors={areaSeriesColorMap}
            id={areaSpecId}
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
            customSeriesColors={averageSeriesColorMap}
            id={averageSpecId}
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
