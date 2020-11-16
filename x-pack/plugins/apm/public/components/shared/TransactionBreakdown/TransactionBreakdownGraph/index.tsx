/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  niceTimeFormatter,
  Placement,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import moment from 'moment';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { asPercent } from '../../../../../common/utils/formatters';
import { TimeSeries } from '../../../../../typings/timeseries';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useChartsSync as useChartsSync2 } from '../../../../hooks/use_charts_sync';
import { unit } from '../../../../style/variables';
import { Annotations } from '../../charts/annotations';
import { ChartContainer } from '../../charts/chart_container';
import { onBrushEnd } from '../../charts/helper/helper';

const XY_HEIGHT = unit * 16;

interface Props {
  fetchStatus: FETCH_STATUS;
  timeseries?: TimeSeries[];
}

export function TransactionBreakdownGraph({ fetchStatus, timeseries }: Props) {
  const history = useHistory();
  const chartRef = React.createRef<Chart>();
  const { event, setEvent } = useChartsSync2();
  const { urlParams } = useUrlParams();
  const { start, end } = urlParams;

  useEffect(() => {
    if (event.chartId !== 'timeSpentBySpan' && chartRef.current) {
      chartRef.current.dispatchExternalPointerEvent(event);
    }
  }, [chartRef, event]);

  const min = moment.utc(start).valueOf();
  const max = moment.utc(end).valueOf();

  const xFormatter = niceTimeFormatter([min, max]);

  return (
    <ChartContainer height={XY_HEIGHT} status={fetchStatus}>
      <Chart ref={chartRef} id="timeSpentBySpan">
        <Settings
          onBrushEnd={({ x }) => onBrushEnd({ x, history })}
          showLegend
          showLegendExtra
          legendPosition={Position.Bottom}
          xDomain={{ min, max }}
          flatLegend
          onPointerUpdate={(currEvent: any) => {
            setEvent(currEvent);
          }}
          externalPointerEvents={{
            tooltip: { visible: true, placement: Placement.Bottom },
          }}
        />
        <Axis
          id="x-axis"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={xFormatter}
        />
        <Axis
          id="y-axis"
          ticks={3}
          position={Position.Left}
          tickFormat={(y: number) => asPercent(y ?? 0, 1)}
        />

        <Annotations />

        {timeseries?.length ? (
          timeseries.map((serie) => {
            return (
              <AreaSeries
                key={serie.title}
                id={serie.title}
                name={serie.title}
                xScaleType={ScaleType.Linear}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={serie.data}
                stackAccessors={['x']}
                stackMode={'percentage'}
                color={serie.areaColor}
              />
            );
          })
        ) : (
          // When timeseries is empty, loads an AreaSeries chart to show the default empty message.
          <AreaSeries id="empty_chart" data={[]} />
        )}
      </Chart>
    </ChartContainer>
  );
}
