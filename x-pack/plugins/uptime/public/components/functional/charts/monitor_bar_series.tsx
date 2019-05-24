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
  TooltipType,
  getAxisId,
  Position,
  timeFormatter,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { MonitorSeriesPoint } from '../../../../common/graphql/types';
import { formatSparklineCounts } from '../format_sparkline_counts';
import { getColorsMap } from './get_colors_map';
import { getChartDateLabel } from '../../../lib/helper';
import { UptimeSettingsContext } from '../../../contexts';

export interface MonitorBarSeriesProps {
  /**
   * The color to use for the display of down states.
   */
  dangerColor: string;
  /**
   * The monitor containing the timeseries data to display.
   */
  downSeries: MonitorSeriesPoint[];
}

const seriesHasCounts = (series: MonitorSeriesPoint[]) => {
  return series.some(point => !!point.y);
};

/**
 * There is a specific focus on the monitor's down count, the up series is not shown,
 * so we will only render the series component if there are down counts for the selected monitor.
 * @param props - the values for the monitor this sparkline reflects
 */
export const MonitorBarSeries = ({ dangerColor, downSeries }: MonitorBarSeriesProps) => {
  const id = getSpecId('downSeries');
  const { absoluteStartDate, absoluteEndDate } = useContext(UptimeSettingsContext);

  return seriesHasCounts(downSeries) ? (
    <div style={{ height: 50, width: '100%' }}>
      <Chart renderer="canvas">
        <Settings tooltipType={TooltipType.VerticalCursor} />
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
          xAccessor={0}
          xScaleType={ScaleType.Time}
          yAccessors={[1]}
          yScaleType={ScaleType.Linear}
        />
      </Chart>
    </div>
  ) : null;
};
