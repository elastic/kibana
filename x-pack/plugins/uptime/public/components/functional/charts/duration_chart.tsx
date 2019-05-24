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

  // this id is used for the line chart representing the average duration length
  const averageSpecId = getSpecId('average');

  return (
    <React.Fragment>
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.uptime.monitorCharts.durationChart.title', {
            defaultMessage: 'Monitor Duration ms',
          })}
        </h4>
      </EuiTitle>
      <EuiPanel>
        <Chart className={'story-chart'}>
          <Axis
            id={getAxisId('bottom')}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
            title={i18n.translate('xpack.uptime.monitorCharts.durationChart.bottomAxis.title', {
              defaultMessage: 'timestamp',
            })}
          />
          <Axis
            domain={{ min: 0 }}
            id={getAxisId('left')}
            position={Position.Left}
            tickFormat={d => Number(d).toFixed(0)}
            title={i18n.translate('xpack.uptime.monitorCharts.durationChart.leftAxis.title', {
              defaultMessage: 'Duration ms',
            })}
          />
          <AreaSeries
            curve={CurveType.CURVE_MONOTONE_X}
            customSeriesColors={getColorsMap(rangeColor, areaSpecId)}
            data={durationArea.map(({ x, yMin, yMax }) => ({
              x,
              Min: microsToMillis(yMin),
              Max: microsToMillis(yMax),
            }))}
            id={areaSpecId}
            xAccessor={'x'}
            xScaleType={ScaleType.Time}
            yAccessors={['Max']}
            yScaleType={ScaleType.Linear}
            y0Accessors={['Min']}
            yScaleToDataExtent={false}
          />
          <LineSeries
            curve={CurveType.CURVE_MONOTONE_X}
            customSeriesColors={getColorsMap(meanColor, averageSpecId)}
            data={durationLine.map(({ x, y }) => [x || 0, microsToMillis(y)])}
            id={averageSpecId}
            xAccessor={0}
            xScaleType={ScaleType.Time}
            yAccessors={[1]}
            yScaleToDataExtent={true}
            yScaleType={ScaleType.Linear}
          />
        </Chart>
      </EuiPanel>
    </React.Fragment>
  );
};
