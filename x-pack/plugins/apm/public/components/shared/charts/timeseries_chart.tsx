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
  ScaleType,
  Settings,
  XYBrushEvent,
  YDomainRange,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Suspense, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  LazyAlertsFlyout,
  useChartTheme,
} from '../../../../../observability/public';
import { asAbsoluteDateTime } from '../../../../common/utils/formatters';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { useAnnotationsContext } from '../../../context/annotations/use_annotations_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { APMServiceAlert } from '../../../context/apm_service/apm_service_context';
import { useChartPointerEventContext } from '../../../context/chart_pointer_event/use_chart_pointer_event_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { unit } from '../../../utils/style';
import { ChartContainer } from './chart_container';
import { getAlertAnnotations } from './helper/get_alert_annotations';
import { getTimeZone } from './helper/timezone';
import { isTimeseriesEmpty, onBrushEnd } from './helper/helper';
import { ServiceAnomalyTimeseries } from '../../../../common/anomaly_detection/service_anomaly_timeseries';
import { getChartAnomalyTimeseries } from './helper/get_chart_anomaly_timeseries';

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
  alerts?: APMServiceAlert[];
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
  alerts,
}: Props) {
  const history = useHistory();
  const { observabilityRuleTypeRegistry, core } = useApmPluginContext();
  const { getFormatter } = observabilityRuleTypeRegistry;
  const { annotations } = useAnnotationsContext();
  const { setPointerEvent, chartRef } = useChartPointerEventContext();
  const theme = useTheme();
  const chartTheme = useChartTheme();
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>(
    undefined
  );

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

  return (
    <ChartContainer
      hasData={!isEmpty}
      height={height}
      status={fetchStatus}
      id={id}
    >
      <Chart ref={chartRef} id={id}>
        <Settings
          tooltip={{ stickTo: 'top' }}
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
          showLegendExtra
          legendPosition={Position.Bottom}
          xDomain={xDomain}
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

        {getAlertAnnotations({
          alerts,
          chartStartTime: xValues[0],
          getFormatter,
          selectedAlertId,
          setSelectedAlertId,
          theme,
        })}
        <Suspense fallback={null}>
          <LazyAlertsFlyout
            alerts={alerts}
            isInApp={true}
            observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
            onClose={() => {
              setSelectedAlertId(undefined);
            }}
            selectedAlertId={selectedAlertId}
          />
        </Suspense>
      </Chart>
    </ChartContainer>
  );
}
