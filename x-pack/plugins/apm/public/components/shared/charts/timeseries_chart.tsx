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
  BarSeries,
  Chart,
  CurveType,
  LegendItemListener,
  LineAnnotation,
  LineSeries,
  niceTimeFormatter,
  Position,
  RectAnnotation,
  RectAnnotationStyle,
  ScaleType,
  SeriesIdentifier,
  Settings,
  XYBrushEvent,
  XYChartSeriesIdentifier,
  YDomainRange,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { isExpectedBoundsComparison } from '../time_comparison/get_comparison_options';
import { ServiceAnomalyTimeseries } from '../../../../common/anomaly_detection/service_anomaly_timeseries';
import { asAbsoluteDateTime } from '../../../../common/utils/formatters';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { useAnnotationsContext } from '../../../context/annotations/use_annotations_context';

import { useChartPointerEventContext } from '../../../context/chart_pointer_event/use_chart_pointer_event_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { unit } from '../../../utils/style';
import { ChartContainer } from './chart_container';
import {
  expectedBoundsTitle,
  getChartAnomalyTimeseries,
} from './helper/get_chart_anomaly_timeseries';
import { isTimeseriesEmpty, onBrushEnd } from './helper/helper';

interface AnomalyTimeseries extends ServiceAnomalyTimeseries {
  color?: string;
}
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
  anomalyTimeseries?: AnomalyTimeseries;
  customTheme?: Record<string, unknown>;
  anomalyTimeseriesColor?: string;
  comparisonEnabled: boolean;
  offset?: string;
  timeZone: string;
}

const END_ZONE_LABEL = i18n.translate('xpack.apm.timeseries.endzone', {
  defaultMessage:
    'The selected time range does not include this entire bucket. It might contain partial data.',
});

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
  comparisonEnabled,
  offset,
  timeZone,
}: Props) {
  const history = useHistory();
  const { annotations } = useAnnotationsContext();
  const { chartRef, updatePointerEvent } = useChartPointerEventContext();
  const theme = useTheme();
  const chartTheme = useChartTheme();
  const anomalyChartTimeseries = getChartAnomalyTimeseries({
    anomalyTimeseries,
    theme,
    anomalyTimeseriesColor: anomalyTimeseries?.color,
  });
  const isEmpty = isTimeseriesEmpty(timeseries);
  const annotationColor = theme.eui.euiColorSuccess;
  const isComparingExpectedBounds =
    comparisonEnabled && isExpectedBoundsComparison(offset);
  const allSeries = [
    ...timeseries,
    ...(isComparingExpectedBounds
      ? anomalyChartTimeseries?.boundaries ?? []
      : []),
    ...(anomalyChartTimeseries?.scores ?? []),
  ]
    // Sorting series so that area type series are before line series
    // This is a workaround so that the legendSort works correctly
    // Can be removed when https://github.com/elastic/elastic-charts/issues/1685 is resolved
    .sort(
      isComparingExpectedBounds
        ? (prev, curr) => prev.type.localeCompare(curr.type)
        : undefined
    );

  const xValues = timeseries.flatMap(({ data }) => data.map(({ x }) => x));
  const xValuesExpectedBounds =
    anomalyChartTimeseries?.boundaries?.flatMap(({ data }) =>
      data.map(({ x }) => x)
    ) ?? [];
  const min = Math.min(...xValues);
  const max = Math.max(...xValues, ...xValuesExpectedBounds);
  const xFormatter = niceTimeFormatter([min, max]);
  const xDomain = isEmpty ? { min: 0, max: 1 } : { min, max };
  // Using custom legendSort here when comparing expected bounds
  // because by default elastic-charts will show legends for expected bounds first
  // but for consistency, we are making `Expected bounds` last
  // See https://github.com/elastic/elastic-charts/issues/1685
  const legendSort = isComparingExpectedBounds
    ? (a: SeriesIdentifier, b: SeriesIdentifier) => {
        if ((a as XYChartSeriesIdentifier)?.specId === expectedBoundsTitle)
          return -1;
        if ((b as XYChartSeriesIdentifier)?.specId === expectedBoundsTitle)
          return -1;
        return 1;
      }
    : undefined;

  const endZoneColor = theme.darkMode
    ? theme.eui.euiColorLightShade
    : theme.eui.euiColorDarkShade;
  const endZoneRectAnnotationStyle: Partial<RectAnnotationStyle> = {
    stroke: endZoneColor,
    fill: endZoneColor,
    strokeWidth: 0,
    opacity: theme.darkMode ? 0.6 : 0.2,
  };

  function getChartType(type: string) {
    switch (type) {
      case 'area':
        return AreaSeries;
      case 'bar':
        return BarSeries;
      default:
        return LineSeries;
    }
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
          tooltip={{
            stickTo: 'top',
            showNullValues: false,
            headerFormatter: ({ value }) => {
              const formattedValue = xFormatter(value);
              if (max === value) {
                return (
                  <>
                    <EuiFlexGroup
                      alignItems="center"
                      responsive={false}
                      gutterSize="xs"
                      style={{ fontWeight: 'normal' }}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="iInCircle" />
                      </EuiFlexItem>
                      <EuiFlexItem>{END_ZONE_LABEL}</EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="xs" />
                    {formattedValue}
                  </>
                );
              }
              return formattedValue;
            },
          }}
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
          onPointerUpdate={updatePointerEvent}
          externalPointerEvents={{
            tooltip: { visible: true },
          }}
          showLegend
          legendSort={legendSort}
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

        <RectAnnotation
          id="__endzones__"
          zIndex={2}
          dataValues={[
            {
              coordinates: { x0: xValues[xValues.length - 2] },
              details: END_ZONE_LABEL,
            },
          ]}
          style={endZoneRectAnnotationStyle}
        />

        {allSeries.map((serie) => {
          const Series = getChartType(serie.type);

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
