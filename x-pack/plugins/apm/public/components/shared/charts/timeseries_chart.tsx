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
  LegendItemListener,
  LineAnnotation,
  LineSeries,
  niceTimeFormatter,
  Position,
  ProjectionClickListener,
  RectAnnotation,
  ScaleType,
  Settings,
  XYBrushEvent,
  YDomainRange,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { ServiceAnomalyTimeseries } from '../../../../common/anomaly_detection/service_anomaly_timeseries';
import { asAbsoluteDateTime } from '../../../../common/utils/formatters';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { WindowParameters } from '../../../../common/correlations/change_point/types';
import { useAnnotationsContext } from '../../../context/annotations/use_annotations_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useChartPointerEventContext } from '../../../context/chart_pointer_event/use_chart_pointer_event_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

import { useChangePointDetection } from '../../../components/app/correlations/use_change_point_detection';
import { useTheme } from '../../../hooks/use_theme';
import { unit } from '../../../utils/style';
import { ChartContainer } from './chart_container';
import { getChartAnomalyTimeseries } from './helper/get_chart_anomaly_timeseries';
import { isTimeseriesEmpty, onBrushEnd } from './helper/helper';
import { getTimeZone } from './helper/timezone';

interface Props {
  id: string;
  fetchStatus: FETCH_STATUS;
  height?: number;
  onToggleLegend?: LegendItemListener;
  timeseries: Array<TimeSeries<Coordinate>>;
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
  anomalyTimeseries?: ServiceAnomalyTimeseries;
  customTheme?: Record<string, unknown>;
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
  anomalyTimeseries,
  customTheme = {},
}: Props) {
  const history = useHistory();
  const { core } = useApmPluginContext();
  const { annotations } = useAnnotationsContext();
  const { setPointerEvent, chartRef } = useChartPointerEventContext();
  const theme = useTheme();
  const chartTheme = useChartTheme();

  const xValues = timeseries.flatMap(({ data }) => data.map(({ x }) => x));

  const timeZone = getTimeZone(core.uiSettings);

  const min = Math.min(...xValues);
  const max = Math.max(...xValues);

  const anomalyChartTimeseries = getChartAnomalyTimeseries({
    anomalyTimeseries,
    theme,
  });

  const xFormatter = niceTimeFormatter([min, max]);
  const isEmpty = isTimeseriesEmpty(timeseries);
  const annotationColor = theme.eui.euiColorSuccess;
  const allSeries = [
    ...timeseries,
    // TODO: re-enable anomaly boundaries when we have a fix for https://github.com/elastic/kibana/issues/100660
    // ...(anomalyChartTimeseries?.boundaries ?? []),
    ...(anomalyChartTimeseries?.scores ?? []),
  ];
  const xDomain = isEmpty ? { min: 0, max: 1 } : { min, max };

  const [windowParameters, setWindowParameters] = useState<
    WindowParameters | undefined
  >();

  /*
   * Given a point in time (e.g. where a user clicks), use simple heuristics to compute:
   *
   * 1. The time window around the click to evaluate for changes
   * 2. The historical time window prior to the click to use as a baseline.
   *
   * The philosophy here is that charts are displayed with different granularities according to their
   * overall time window. We select the change point and historical time windows inline with the
   * overall time window.
   *
   * The algorithm for doing this is based on the typical granularities that exist in machine data.
   *
   * :param clickTime
   * :param minTime
   * :param maxTime
   * :return: { baseline_min, baseline_max, deviation_min, deviation_max }
   */
  const getWindowParameters = (
    clickTime: number,
    minTime: number,
    maxTime: number
  ): WindowParameters => {
    const totalWindow = maxTime - minTime;

    // min deviation window
    const minDeviationWindow = 10 * 60 * 1000; // 10min
    const minBaselineWindow = 30 * 60 * 1000; // 30min
    const minWindowGap = 5 * 60 * 1000; // 5min

    // work out bounds
    const deviationWindow = Math.max(totalWindow / 10, minDeviationWindow);
    const baselineWindow = Math.max(totalWindow / 3.5, minBaselineWindow);
    const windowGap = Math.max(totalWindow / 10, minWindowGap);

    const deviationMin = clickTime - deviationWindow / 2;
    const deviationMax = clickTime + deviationWindow / 2;

    const baselineMax = deviationMin - windowGap;
    const baselineMin = baselineMax - baselineWindow;

    return {
      baselineMin: Math.round(baselineMin),
      baselineMax: Math.round(baselineMax),
      deviationMin: Math.round(deviationMin),
      deviationMax: Math.round(deviationMax),
    };
  };

  const changePoint: ProjectionClickListener = ({ x }) => {
    console.log('x', x);
    if (typeof x === 'number') {
      const wp = getWindowParameters(x, min, max);
      setWindowParameters(wp);
    }
  };
  console.log('windowXXX', windowParameters);

  const { progress, response, startFetch } = useChangePointDetection(
    windowParameters ?? {}
  );

  useEffect(() => {
    if (windowParameters) {
      startFetch();
    }
  }, [windowParameters, startFetch]);

  if (progress.isRunning) {
    console.log('useChangePointDetection', progress, response);
  }

  return (
    <ChartContainer
      hasData={!isEmpty}
      height={height}
      status={fetchStatus}
      id={id}
    >
      <Chart ref={chartRef} id={id}>
        <Settings
          tooltip={{ stickTo: 'top', showNullValues: true }}
          onBrushEnd={(event) =>
            onBrushEnd({ x: (event as XYBrushEvent).x, history })
          }
          theme={[
            customTheme,
            {
              areaSeriesStyle: {
                line: { visible: false },
              },
            },
            ...chartTheme,
          ]}
          onPointerUpdate={setPointerEvent}
          externalPointerEvents={{
            tooltip: { visible: true },
          }}
          showLegend
          legendPosition={Position.Bottom}
          xDomain={xDomain}
          onLegendItemClick={(legend) => {
            if (onToggleLegend) {
              onToggleLegend(legend);
            }
          }}
          onProjectionClick={changePoint}
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

        {windowParameters && (
          <>
            <RectAnnotation
              dataValues={[
                {
                  coordinates: {
                    x0: windowParameters.baselineMin,
                    x1: windowParameters.baselineMax,
                    y0: 0,
                    y1: 1000000000,
                  },
                  details: 'baseline',
                },
              ]}
              id="rect_annotation_1"
              style={{
                strokeWidth: 1,
                stroke: theme.eui.euiColorLightShade,
                fill: theme.eui.euiColorLightShade,
                opacity: 0.9,
              }}
              hideTooltips={true}
            />
            <RectAnnotation
              dataValues={[
                {
                  coordinates: {
                    x0: windowParameters.deviationMin,
                    x1: windowParameters.deviationMax,
                    y0: 0,
                    y1: 1000000000,
                  },
                  details: 'deviation',
                },
              ]}
              id="rect_annotation_w"
              style={{
                strokeWidth: 1,
                stroke: theme.eui.euiColorVis4,
                fill: theme.eui.euiColorLightShade,
                opacity: 0.9,
              }}
              hideTooltips={true}
            />
          </>
        )}

        {allSeries.map((serie) => {
          const Series = serie.type === 'area' ? AreaSeries : LineSeries;

          return (
            <Series
              timeZone={timeZone}
              key={serie.title}
              id={serie.id || serie.title}
              groupId={serie.groupId}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={serie.yAccessors ?? ['y']}
              y0Accessors={serie.y0Accessors}
              stackAccessors={serie.stackAccessors ?? undefined}
              markSizeAccessor={serie.markSizeAccessor}
              data={isEmpty ? [] : serie.data}
              color={serie.color}
              curve={CurveType.CURVE_MONOTONE_X}
              hideInLegend={serie.hideLegend}
              fit={serie.fit ?? undefined}
              filterSeriesInTooltip={
                serie.hideTooltipValue ? () => false : undefined
              }
              areaSeriesStyle={serie.areaSeriesStyle}
              lineSeriesStyle={serie.lineSeriesStyle}
            />
          );
        })}
      </Chart>
    </ChartContainer>
  );
}
