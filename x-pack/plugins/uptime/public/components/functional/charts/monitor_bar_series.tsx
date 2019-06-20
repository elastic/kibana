/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  getSpecId,
  ScaleType,
  Settings,
  getAxisId,
  Position,
  timeFormatter,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { MonitorSeriesPoint } from '../../../../common/graphql/types';
import { formatSparklineCounts } from '../format_sparkline_counts';
import { getColorsMap } from './get_colors_map';
import { getChartDateLabel, seriesHasYValues } from '../../../lib/helper';

export interface MonitorBarSeriesProps {
  /**
   * The date/time for the start of the timespan.
   */
  absoluteStartDate: number;
  /**
   * The date/time for the end of the timespan.
   */
  absoluteEndDate: number;
  /**
   * The color to use for the display of down states.
   */
  dangerColor: string;
  /**
   * The monitor containing the timeseries data to display.
   */
  downSeries: MonitorSeriesPoint[];
}

/**
 * There is a specific focus on the monitor's down count, the up series is not shown,
 * so we will only render the series component if there are down counts for the selected monitor.
 * @param props - the values for the monitor this chart visualizes
 */
export const MonitorBarSeries = ({
  absoluteStartDate,
  absoluteEndDate,
  dangerColor,
  downSeries,
}: MonitorBarSeriesProps) => {
  const id = getSpecId('downSeries');

  return seriesHasYValues(downSeries) ? (
    <div style={{ height: 50, width: '100%' }}>
      <Chart>
        <Settings xDomain={{ min: absoluteStartDate, max: absoluteEndDate }} />
        <Axis
          hide
          id={getAxisId('bottom')}
          position={Position.Bottom}
          tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
        />
        <BarSeries
          customSeriesColors={getColorsMap(dangerColor, id)}
          data={formatSparklineCounts(downSeries).map(({ x, y }) => [x, y])}
          id={id}
          name={i18n.translate('xpack.uptime.monitorList.downLineSeries.downLabel', {
            defaultMessage: 'Down checks',
          })}
          timeZone="local"
          xAccessor={0}
          xScaleType={ScaleType.Time}
          yAccessors={[1]}
          yScaleType={ScaleType.Linear}
        />
      </Chart>
    </div>
  ) : null;
};
