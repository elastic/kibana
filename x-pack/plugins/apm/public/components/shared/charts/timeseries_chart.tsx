/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AnnotationDomainTypes,
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  LegendItemListener,
  LineAnnotation,
  LineSeries,
  niceTimeFormatter,
  Placement,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  YDomainRange,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useChartTheme } from '../../../../../observability/public';
import { asAbsoluteDateTime } from '../../../../common/utils/formatters';
import { RectCoordinate, TimeSeries } from '../../../../typings/timeseries';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useAnnotationsContext } from '../../../context/annotations/use_annotations_context';
import { useChartPointerEventContext } from '../../../context/chart_pointer_event/use_chart_pointer_event_context';
import { AnomalySeries } from '../../../selectors/chart_selectors';
import { unit } from '../../../style/variables';
import { ChartContainer } from './chart_container';
import { onBrushEnd } from './helper/helper';

interface Props {
  id: string;
  fetchStatus: FETCH_STATUS;
  height?: number;
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
  yDomain?: YDomainRange;
  anomalySeries?: AnomalySeries;
}

export function TimeseriesChart({
  id,
  height = unit * 16,
  fetchStatus,
  onToggleLegend,
  timeseries,
  yLabelFormat,
  yTickFormat,
  showAnnotations = true,
  yDomain,
  anomalySeries,
}: Props) {
  const history = useHistory();
  const chartRef = React.createRef<Chart>();
  const { annotations } = useAnnotationsContext();
  const chartTheme = useChartTheme();
  const { pointerEvent, setPointerEvent } = useChartPointerEventContext();
  const { urlParams } = useUrlParams();
  const theme = useTheme();

  const { start, end } = urlParams;

  useEffect(() => {
    if (pointerEvent && pointerEvent?.chartId !== id && chartRef.current) {
      chartRef.current.dispatchExternalPointerEvent(pointerEvent);
    }
  }, [pointerEvent, chartRef, id]);

  const min = moment.utc(start).valueOf();
  const max = moment.utc(end).valueOf();

  const xFormatter = niceTimeFormatter([min, max]);

  const isEmpty = timeseries
    .map((serie) => serie.data)
    .flat()
    .every(
      ({ y }: { x?: number | null; y?: number | null }) =>
        y === null || y === undefined
    );

  const annotationColor = theme.eui.euiColorSecondary;

  return (
    <ChartContainer hasData={!isEmpty} height={height} status={fetchStatus}>
      <Chart ref={chartRef} id={id}>
        <Settings
          onBrushEnd={({ x }) => onBrushEnd({ x, history })}
          theme={{
            ...chartTheme,
            areaSeriesStyle: {
              line: { visible: false },
            },
          }}
          onPointerUpdate={setPointerEvent}
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
          gridLine={{ visible: false }}
        />
        <Axis
          domain={yDomain}
          id="y-axis"
          ticks={3}
          position={Position.Left}
          tickFormat={yTickFormat ? yTickFormat : yLabelFormat}
          labelFormat={yLabelFormat}
        />

        {showAnnotations && (
          <LineAnnotation
            id="annotations"
            domainType={AnnotationDomainTypes.XDomain}
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

        {timeseries.map((serie) => {
          const Series = serie.type === 'area' ? AreaSeries : LineSeries;

          return (
            <Series
              key={serie.title}
              id={serie.title}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={isEmpty ? [] : serie.data}
              color={serie.color}
              curve={CurveType.CURVE_MONOTONE_X}
            />
          );
        })}

        {anomalySeries?.bounderies && (
          <AreaSeries
            key={anomalySeries.bounderies.title}
            id={anomalySeries.bounderies.title}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            y0Accessors={['y0']}
            data={anomalySeries.bounderies.data}
            color={anomalySeries.bounderies.color}
            curve={CurveType.CURVE_MONOTONE_X}
            hideInLegend
            filterSeriesInTooltip={() => false}
          />
        )}

        {anomalySeries?.scores && (
          <RectAnnotation
            key={anomalySeries.scores.title}
            id="score_anomalies"
            dataValues={(anomalySeries.scores.data as RectCoordinate[]).map(
              ({ x0, x: x1 }) => ({
                coordinates: { x0, x1 },
              })
            )}
            style={{ fill: anomalySeries.scores.color }}
          />
        )}
      </Chart>
    </ChartContainer>
  );
}
