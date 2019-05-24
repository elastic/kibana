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
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { StatusData } from '../../../../common/graphql/types';
import { getChartDateLabel } from '../../../lib/helper';
import { UptimeSettingsContext } from '../../../contexts';

interface ChecksChartProps {
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

/**
 * Renders a chart that displays the total count of up/down status checks over time
 * as a stacked area chart.
 * @param props The props values required by this component.
 */
export const ChecksChart = ({ dangerColor, status, successColor }: ChecksChartProps) => {
  const checkareaseriesspecid = getSpecId('Up');
  const checkdownseriesspecid = getSpecId('Down');
  const { absoluteStartDate, absoluteEndDate } = useContext(UptimeSettingsContext);

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
              domain={{ absoluteStartDate, absoluteEndDate }}
              legendPosition={Position.Top}
              showLegend={false}
            />
          }
          <Axis
            id={getAxisId('checksBottom')}
            position={Position.Bottom}
            tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
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
