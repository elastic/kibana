/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  CustomSeriesColorsMap,
  DataSeriesColorsValues,
  getAxisId,
  getSpecId,
  Position,
  Settings,
  ScaleType,
  timeFormatter,
} from '@elastic/charts';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Moment } from 'moment';
import { StatusData } from '../../../../common/graphql/types';

interface ChecksChartProps {
  /**
   * The beginning of the date range used for this data, used to set the custom domain
   * of the chart.
   */
  absoluteStart: Moment | undefined;
  /**
   * The end of the date range used for this data, used to set the custom domain
   * of the chart.
   */
  absoluteEnd: Moment | undefined;
  /**
   * The color that will be used for the area series displaying "Down" checks.
   */
  dangerColor: string;
  /**
   * The timeseries data displayed in the chart.
   */
  status: StatusData[];
  /**
   * The color that will be used for the area series displaying "Up" checks.
   */
  successColor: string;
}

export const ChecksChart = ({
  absoluteStart,
  absoluteEnd,
  dangerColor,
  status,
  successColor,
}: ChecksChartProps) => {
  const checkareaseriesspecid = getSpecId('Up');
  const checkdownseriesspecid = getSpecId('Down');

  const durationColors: CustomSeriesColorsMap = new Map<DataSeriesColorsValues, string>();
  durationColors.set(
    {
      colorValues: [],
      specId: checkareaseriesspecid,
    },
    successColor
  );
  const durationDown: CustomSeriesColorsMap = new Map<DataSeriesColorsValues, string>();
  durationDown.set(
    {
      colorValues: [],
      specId: checkdownseriesspecid,
    },
    dangerColor
  );

  const upString = i18n.translate('xpack.uptime.monitorCharts.checkStatus.series.upCountLabel', {
    defaultMessage: 'Up count',
  });
  const downString = i18n.translate(
    'xpack.uptime.monitorCharts.checkStatus.series.downCountLabel',
    {
      defaultMessage: 'Down count',
    }
  );

  if (absoluteStart === undefined || absoluteEnd === undefined) {
    // TODO: create a richer error state
    return <div>Invalid date range</div>;
  }

  return (
    <React.Fragment>
      <EuiTitle size="xs">
        <h4>Check status</h4>
      </EuiTitle>
      <EuiPanel>
        <Chart renderer="canvas">
          {
            // @ts-ignore
            <Settings
              domain={{ min: absoluteStart.valueOf(), max: absoluteEnd.valueOf() }}
              legendPosition={Position.Top}
              showLegend={false}
            />
          }
          <Axis
            id={getAxisId('checksBottom')}
            position={Position.Bottom}
            tickFormat={timeFormatter('HH:mm')}
            showOverlappingTicks={true}
          />
          <Axis
            id={getAxisId('left')}
            position={Position.Left}
            tickFormat={d => Number(d).toFixed(0)}
          />
          <AreaSeries
            customSeriesColors={durationColors}
            id={checkareaseriesspecid}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={[upString]}
            seriesType="area"
            stackAccessors={['x']}
            data={status.map(({ x, up }) => ({
              x,
              [upString]: up || 0,
            }))}
          />
          <AreaSeries
            customSeriesColors={durationDown}
            id={checkdownseriesspecid}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={[downString]}
            seriesType="area"
            stackAccessors={['x']}
            data={status.map(({ x, down }) => ({
              x,
              [downString]: down || 0,
            }))}
          />
        </Chart>
      </EuiPanel>
    </React.Fragment>
  );
};
