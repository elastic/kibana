/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
  CurveType,
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
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactElement } from 'react';
import { useHistory } from 'react-router-dom';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { isExpectedBoundsComparison } from '../time_comparison/get_comparison_options';

import { useChartPointerEventContext } from '../../../context/chart_pointer_event/use_chart_pointer_event_context';
import { useTheme } from '../../../hooks/use_theme';
import { unit } from '../../../utils/style';
import { ChartContainer } from './chart_container';
import {
  expectedBoundsTitle,
  getChartAnomalyTimeseries,
} from './helper/get_chart_anomaly_timeseries';
import { isTimeseriesEmpty, onBrushEnd } from './helper/helper';
import { TimeseriesChartWithContextProps } from './timeseries_chart_with_context';

const END_ZONE_LABEL = i18n.translate('xpack.apm.timeseries.endzone', {
  defaultMessage:
    'The selected time range does not include this entire bucket. It might contain partial data.',
});
interface TimeseriesChartProps extends TimeseriesChartWithContextProps {
  comparisonEnabled: boolean;
  offset?: string;
  timeZone: string;
  annotations?: Array<
    ReactElement<typeof RectAnnotation | typeof LineAnnotation>
  >;
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
  comparisonEnabled,
  offset,
  timeZone,
  annotations,
}: TimeseriesChartProps) {
  const history = useHistory();
  const { chartRef, updatePointerEvent } = useChartPointerEventContext();
  const theme = useTheme();
  const chartTheme = useChartTheme();
  const anomalyChartTimeseries = getChartAnomalyTimeseries({
    anomalyTimeseries,
    theme,
    anomalyTimeseriesColor: anomalyTimeseries?.color,
  });
  const isEmpty = isTimeseriesEmpty(timeseries);
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
        {showAnnotations && annotations}
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
