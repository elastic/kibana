/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  LegendItemListener,
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
import { useHistory } from 'react-router-dom';
import { TimeSeries } from '../../../../../typings/timeseries';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useChartsSync } from '../../../../hooks/use_charts_sync';
import { unit } from '../../../../style/variables';
import { Annotations } from '../annotations';
import { ChartContainer } from '../chart_container';
import { onBrushEnd } from '../helper/helper';

interface Props {
  id: string;
  fetchStatus: FETCH_STATUS;
  onToggleLegend?: LegendItemListener;
  timeseries: TimeSeries[];
  /**
   * Formatter for y-axis tick values
   */
  yLabelFormat: (y: number) => string;
  /**
   * Formatter for legend and tooltip values
   */
  yTickFormat?: (y: number) => string;
  showAnnotations?: boolean;
}

const XY_HEIGHT = unit * 16;

export function LineChart({
  id,
  fetchStatus,
  onToggleLegend,
  timeseries,
  yLabelFormat,
  yTickFormat,
  showAnnotations = true,
}: Props) {
  const history = useHistory();
  const chartRef = React.createRef<Chart>();
  const { event, setEvent } = useChartsSync();
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

  const isEmpty = timeseries
    .map((serie) => serie.data)
    .flat()
    .every(
      ({ y }: { x?: number | null; y?: number | null }) =>
        y === null || y === undefined
    );

  return (
    <ChartContainer status={fetchStatus} hasData={!isEmpty} height={XY_HEIGHT}>
      <Chart ref={chartRef} id={id}>
        <Settings
          onBrushEnd={({ x }) => onBrushEnd({ x, history })}
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
          onLegendItemClick={(legend) => {
            if (onToggleLegend) {
              onToggleLegend(legend);
            }
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
          tickFormat={yTickFormat ? yTickFormat : yLabelFormat}
          labelFormat={yLabelFormat}
          showGridLines
        />

        {showAnnotations && <Annotations />}

        {timeseries.map((serie) => {
          return (
            <LineSeries
              key={serie.title}
              id={serie.title}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={isEmpty ? [] : serie.data}
              color={serie.color}
            />
          );
        })}
      </Chart>
    </ChartContainer>
  );
}
