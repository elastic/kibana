/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  LineAnnotation,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  TickFormatter,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Annotation } from '../../../../../common/annotations';
import { useChartTheme } from '../../../../../../observability/public';
import {
  asAbsoluteDateTime,
  asDuration,
  asPercent,
} from '../../../../../common/utils/formatters';
import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { useChartPointerEventContext } from '../../../../context/chart_pointer_event/use_chart_pointer_event_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { unit } from '../../../../utils/style';
import { ChartContainer } from '../../charts/chart_container';
import { isTimeseriesEmpty, onBrushEnd } from '../../charts/helper/helper';

interface Props {
  fetchStatus: FETCH_STATUS;
  height?: number;
  showAnnotations: boolean;
  annotations: Annotation[];
  timeseries?: Array<TimeSeries<Coordinate>>;
  yAxisType: 'duration' | 'percentage';
}

const asPercentBound = (y: number | null) => asPercent(y, 1);
const asDurationBound = (y: number | null) => asDuration(y);

export function BreakdownChart({
  fetchStatus,
  height = unit * 16,
  showAnnotations,
  annotations,
  timeseries,
  yAxisType,
}: Props) {
  const history = useHistory();
  const chartTheme = useChartTheme();

  const { chartRef, setPointerEvent } = useChartPointerEventContext();
  const { urlParams } = useUrlParams();
  const theme = useTheme();
  const { start, end } = urlParams;

  const min = moment.utc(start).valueOf();
  const max = moment.utc(end).valueOf();

  const xFormatter = niceTimeFormatter([min, max]);

  const annotationColor = theme.eui.euiColorSecondary;

  const isEmpty = isTimeseriesEmpty(timeseries);

  const yTickFormat: TickFormatter =
    yAxisType === 'duration' ? asDurationBound : asPercentBound;

  return (
    <ChartContainer height={height} hasData={!isEmpty} status={fetchStatus}>
      <Chart ref={chartRef}>
        <Settings
          tooltip={{ stickTo: 'top' }}
          onBrushEnd={({ x }) => onBrushEnd({ x, history })}
          showLegend
          showLegendExtra
          legendPosition={Position.Bottom}
          theme={chartTheme}
          xDomain={{ min, max }}
          flatLegend
          onPointerUpdate={setPointerEvent}
          externalPointerEvents={{
            tooltip: {
              visible: true,
            },
          }}
        />
        <Axis
          id="x-axis"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={xFormatter}
          gridLine={{ visible: false }}
        />
        <Axis
          id="y-axis"
          ticks={3}
          position={Position.Left}
          tickFormat={yTickFormat}
        />

        {showAnnotations && (
          <LineAnnotation
            id="annotations"
            domainType={AnnotationDomainType.XDomain}
            dataValues={annotations.map((annotation) => ({
              dataValue: annotation['@timestamp'],
              header: asAbsoluteDateTime(annotation['@timestamp']),
              details: `${i18n.translate('xpack.apm.chart.annotation.version', {
                defaultMessage: 'Version',
              })} ${annotation.text}`,
            }))}
            style={{
              line: { strokeWidth: 1, stroke: annotationColor, opacity: 1 },
            }}
            marker={<EuiIcon type="dot" color={annotationColor} />}
            markerPosition={Position.Top}
          />
        )}

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
                stackMode={
                  yAxisType === 'percentage' ? 'percentage' : undefined
                }
                color={serie.areaColor}
                curve={CurveType.CURVE_MONOTONE_X}
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
