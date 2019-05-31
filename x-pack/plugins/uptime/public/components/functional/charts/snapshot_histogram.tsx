/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  getAxisId,
  getSpecId,
  Position,
  ScaleType,
  timeFormatter,
  Settings,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useContext } from 'react';
import { HistogramDataPoint } from '../../../../common/graphql/types';
import { getColorsMap } from './get_colors_map';
import { getChartDateLabel } from '../../../lib/helper';
import { UptimeSettingsContext } from '../../../contexts';

export interface SnapshotHistogramProps {
  /**
   * The color value that is used to represent up checks.
   */
  successColor: string;
  /**
   * The color value that is used to represent down checks.
   */
  dangerColor: string;
  /**
   * The data the histogram will visualize.
   */
  histogram: HistogramDataPoint[];
}

export const SnapshotHistogram = ({
  dangerColor,
  histogram,
  successColor,
}: SnapshotHistogramProps) => {
  const { absoluteStartDate, absoluteEndDate } = useContext(UptimeSettingsContext);
  const downMonitorsName = i18n.translate('xpack.uptime.snapshotHistogram.downMonitorsId', {
    defaultMessage: 'Down Monitors',
  });
  const downSpecId = getSpecId(downMonitorsName);

  const upMonitorsId = i18n.translate('xpack.uptime.snapshotHistogram.series.upLabel', {
    defaultMessage: 'Up',
  });
  const upSpecId = getSpecId(upMonitorsId);
  return (
    <Fragment>
      <Chart>
        <Settings xDomain={{ min: absoluteStartDate, max: absoluteEndDate }} showLegend={false} />
        <Axis
          id={getAxisId(
            i18n.translate('xpack.uptime.snapshotHistogram.xAxisId', {
              defaultMessage: 'Snapshot X Axis',
            })
          )}
          position={Position.Bottom}
          showOverlappingTicks={false}
          tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
        />
        <Axis
          id={getAxisId(
            i18n.translate('xpack.uptime.snapshotHistogram.yAxisId', {
              defaultMessage: 'Snapshot Y Axis',
            })
          )}
          position={Position.Left}
          showOverlappingTicks={true}
          title="Monitors"
        />
        <BarSeries
          customSeriesColors={getColorsMap(successColor, upSpecId)}
          data={histogram.map(({ x, upCount }) => [x, upCount || 0])}
          id={upSpecId}
          name={upMonitorsId}
          stackAccessors={[0]}
          xAccessor={0}
          xScaleType={ScaleType.Time}
          yAccessors={[1]}
          yScaleType={ScaleType.Linear}
        />
        <BarSeries
          customSeriesColors={getColorsMap(dangerColor, downSpecId)}
          data={histogram.map(({ x, downCount }) => [x, downCount || 0])}
          id={downSpecId}
          name={i18n.translate('xpack.uptime.snapshotHistogram.series.downLabel', {
            defaultMessage: 'Down',
          })}
          stackAccessors={[0]}
          xAccessor={0}
          xScaleType={ScaleType.Time}
          yAccessors={[1]}
          yScaleType={ScaleType.Linear}
        />
      </Chart>
    </Fragment>
  );
};
