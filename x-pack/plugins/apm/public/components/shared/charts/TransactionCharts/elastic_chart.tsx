/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  LineSeries,
  niceTimeFormatter,
  Placement,
  Position,
  ScaleType,
  Settings,
  SettingsSpec,
} from '@elastic/charts';
import moment from 'moment';
import React, { useEffect } from 'react';
import { TimeSeries } from '../../../../../typings/timeseries';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useChartsSync as useChartsSync2 } from '../../../../hooks/use_charts_sync';
import { unit } from '../../../../style/variables';
import { Annotations } from '../annotations';

const XY_HEIGHT = unit * 16;

interface Props {
  timeseries: TimeSeries[];
  tickFormatY: (y: number) => React.ReactNode;
  id: string;
}

export function ElasticChart({ timeseries, tickFormatY, id }: Props) {
  const chartRef = React.createRef<Chart>();
  const { event, setEvent } = useChartsSync2();
  const { urlParams } = useUrlParams();
  const { start, end } = urlParams;

  useEffect(() => {
    if (event.chartId !== id && chartRef.current) {
      chartRef.current.dispatchExternalPointerEvent(event);
    }
  }, [event, chartRef, id]);

  const min = moment.utc(start).valueOf();
  const max = moment.utc(end).valueOf();

  const xFormatter = niceTimeFormatter([min, max]);

  const chartTheme: SettingsSpec['theme'] = {
    lineSeriesStyle: {
      point: { visible: false },
      line: { strokeWidth: 2 },
    },
  };

  return (
    <div style={{ height: XY_HEIGHT }}>
      <Chart ref={chartRef} id={id}>
        <Settings
          theme={chartTheme}
          onPointerUpdate={(currEvent: any) => {
            setEvent(currEvent);
          }}
          externalPointerEvents={{
            tooltip: { visible: true, placement: Placement.Bottom },
          }}
          showLegend
          showLegendExtra
          legendPosition={Position.Bottom}
          xDomain={{ min, max }}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={xFormatter}
        />
        <Axis
          id="left"
          ticks={3}
          position={Position.Left}
          tickFormat={tickFormatY}
          showGridLines
        />

        <Annotations />

        {timeseries.map((serie) => {
          return (
            <LineSeries
              key={serie.title}
              id={serie.title}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={serie.data}
              color={serie.color}
            />
          );
        })}
      </Chart>
    </div>
  );
}
