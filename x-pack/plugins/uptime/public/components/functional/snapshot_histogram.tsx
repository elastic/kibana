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
} from '@elastic/charts';
import DateMath from '@elastic/datemath';
// @ts-ignore Missing typings for series charts
import { EuiHistogramSeries, EuiSeriesChart, EuiSeriesChartUtils } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { HistogramDataPoint } from '../../../common/graphql/types';
import { getColorsMap } from './charts/get_colors_map';
import { getChartDateLabel } from '../../lib/helper';

export interface SnapshotHistogramProps {
  dateRangeStart: string;
  dateRangeEnd: string;
  successColor: string;
  dangerColor: string;
  histogram: HistogramDataPoint[];
}

export const SnapshotHistogram = ({
  dateRangeStart,
  dateRangeEnd,
  dangerColor,
  histogram,
  successColor,
}: SnapshotHistogramProps) => {
  const min = DateMath.parse(dateRangeStart);
  const max = DateMath.parse(dateRangeEnd);
  if (!max || !min) {
    return null;
  }
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
      <Chart renderer="canvas">
        <Axis
          id={getAxisId(
            i18n.translate('xpack.uptime.snapshotHistogram.xAxisId', {
              defaultMessage: 'Snapshot X Axis',
            })
          )}
          position={Position.Bottom}
          tickFormat={timeFormatter(getChartDateLabel(min.valueOf(), max.valueOf()))}
          showOverlappingTicks={false}
        />
        <Axis
          id={getAxisId(
            i18n.translate('xpack.uptime.snapshotHistogram.yAxisId', {
              defaultMessage: 'Snapshot Y Axis',
            })
          )}
          position={Position.Left}
          title="Monitor status"
          showOverlappingTicks={true}
        />
        <BarSeries
          customSeriesColors={getColorsMap(successColor, upSpecId)}
          id={upSpecId}
          name={upMonitorsId}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          stackAccessors={[0]}
          data={histogram.map(({ x, upCount }) => [x, upCount || 0])}
        />
        <BarSeries
          customSeriesColors={getColorsMap(dangerColor, downSpecId)}
          id={downSpecId}
          name={i18n.translate('xpack.uptime.snapshotHistogram.series.downLabel', {
            defaultMessage: 'Down',
          })}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          stackAccessors={[0]}
          data={histogram.map(({ x, downCount }) => [x, downCount || 0])}
        />
      </Chart>
    </Fragment>
  );
};
