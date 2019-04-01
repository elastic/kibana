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
// @ts-ignore Missing typings for series charts
import { EuiHistogramSeries, EuiSeriesChart, EuiSeriesChartUtils } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { HistogramDataPoint } from '../../../common/graphql/types';

export interface SnapshotHistogramProps {
  windowWidth: number;
  primaryColor: string;
  dangerColor: string;
  histogram: HistogramDataPoint[];
}

export const SnapshotHistogram = ({
  dangerColor,
  histogram,
  primaryColor,
  windowWidth,
}: SnapshotHistogramProps) => (
  <Fragment>
    <div style={{ height: 220 }}>
      <Chart renderer="canvas">
        <Axis
          id={getAxisId(
            i18n.translate('xpack.uptime.snapshotHistogram.xAxisId', {
              defaultMessage: 'Snapshot X Axis',
            })
          )}
          position={Position.Bottom}
          tickFormat={timeFormatter('HH:mm')}
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
          id={getSpecId(
            i18n.translate('xpack.uptime.snapshotHistogram.upMonitorsId', {
              defaultMessage: 'Up Monitors',
            })
          )}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          stackAccessors={[0]}
          data={histogram.map(({ x, upCount }) => [x, upCount || 0])}
        />
        <BarSeries
          id={getSpecId(
            i18n.translate('xpack.uptime.snapshotHistogram.downMonitorsId', {
              defaultMessage: 'Down Monitors',
            })
          )}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          stackAccessors={[0]}
          data={histogram.map(({ x, downCount }) => [x, downCount || 0])}
        />
      </Chart>
    </div>
    {/* <EuiSeriesChart
      width={windowWidth * windowRatio}
      height={120}
      stackBy="y"
      xType={EuiSeriesChartUtils.SCALE.TIME}
      xCrosshairFormat="YYYY-MM-DD hh:mmZ"
    >
      <EuiHistogramSeries
        data={histogram.map(({ x, x0, upCount }) => ({ x, x0, y: upCount }))}
        name={i18n.translate('xpack.uptime.snapshotHistogram.series.upLabel', {
          defaultMessage: 'Up',
        })}
        color={primaryColor}
      />
      <EuiHistogramSeries
        data={histogram.map(({ x, x0, downCount }) => ({ x, x0, y: downCount }))}
        name={i18n.translate('xpack.uptime.snapshotHistogram.series.downLabel', {
          defaultMessage: 'Down',
        })}
        color={dangerColor}
      />
    </EuiSeriesChart> */}
  </Fragment>
);
