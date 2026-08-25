/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialTheme } from '@elastic/charts';
import {
  AreaSeries,
  BarSeries,
  Chart,
  CurveType,
  LineSeries,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { unit } from '@kbn/apm-common';
import type { Coordinate } from '../../../../../typings/timeseries';
import { getComparisonChartTheme } from '../../time_comparison/get_comparison_chart_theme';
import { APM_DOTTED_LINE_STYLE, splitSeriesAtNullGaps } from '../utils/timeseries_gap_handling';

function hasValidTimeseries(series?: Coordinate[] | null): series is Coordinate[] {
  return !!series?.some((point) => point.y !== null);
}

const flexGroupStyle = { overflow: 'hidden' };

type SparkPlotType = 'line' | 'bar';

export function SparkPlot({
  type = 'line',
  color,
  isLoading,
  series,
  comparisonSeries = [],
  valueLabel,
  compact,
  comparisonSeriesColor,
}: {
  type?: SparkPlotType;
  color: string;
  isLoading: boolean;
  series?: Coordinate[] | null;
  valueLabel: React.ReactNode;
  compact?: boolean;
  comparisonSeries?: Coordinate[];
  comparisonSeriesColor?: string;
}) {
  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      gutterSize="xs"
      responsive={false}
      alignItems="flexEnd"
      style={flexGroupStyle}
    >
      <EuiFlexItem>{valueLabel}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SparkPlotItem
          type={type}
          color={color}
          isLoading={isLoading}
          series={series}
          comparisonSeries={comparisonSeries}
          comparisonSeriesColor={comparisonSeriesColor}
          compact={compact}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function SparkPlotItem({
  type,
  color,
  isLoading,
  series,
  comparisonSeries,
  comparisonSeriesColor,
  compact,
}: {
  type?: SparkPlotType;
  color: string;
  isLoading: boolean;
  series?: Coordinate[] | null;
  compact?: boolean;
  comparisonSeries?: Coordinate[];
  comparisonSeriesColor?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const defaultChartThemes = useChartThemes();
  const comparisonChartTheme = getComparisonChartTheme();
  const hasComparisonSeries = !!comparisonSeries?.length;

  const sparkplotChartTheme: PartialTheme = {
    chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
    lineSeriesStyle: {
      point: { opacity: 0 },
    },
    areaSeriesStyle: {
      point: { opacity: 0 },
    },
    ...(hasComparisonSeries ? comparisonChartTheme : {}),
  };

  const chartSize = {
    height: euiTheme.size.l,
    width: compact ? unit * 4 : unit * 5,
  };

  if (isLoading) {
    return (
      <div
        style={{
          ...chartSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiLoadingChart />
      </div>
    );
  }

  if (hasValidTimeseries(series)) {
    const { mainSegments, leadingEdge, trailingEdge, interiorEdges } =
      splitSeriesAtNullGaps(series);

    const comparisonSplit = hasComparisonSeries ? splitSeriesAtNullGaps(comparisonSeries) : null;

    return (
      <Chart size={chartSize}>
        <Settings
          theme={[sparkplotChartTheme, ...defaultChartThemes.theme]}
          baseTheme={defaultChartThemes.baseTheme}
          showLegend={false}
          locale={i18n.getLocale()}
        />
        <Tooltip type="none" />
        {type && type === 'bar' ? (
          <>
            <BarSeries
              id="barSeries"
              xScaleType={ScaleType.Linear}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={series}
              color={color}
            />
            {hasComparisonSeries && (
              <BarSeries
                id="comparisonBarSeries"
                xScaleType={ScaleType.Linear}
                yScaleType={ScaleType.Linear}
                xAccessor={'x'}
                yAccessors={['y']}
                data={comparisonSeries}
                color={comparisonSeriesColor}
              />
            )}
          </>
        ) : (
          <>
            {leadingEdge ? (
              <LineSeries
                id="Sparkline_edge_leading"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={'x'}
                yAccessors={['y']}
                data={leadingEdge}
                color={color}
                curve={CurveType.CURVE_MONOTONE_X}
                lineSeriesStyle={APM_DOTTED_LINE_STYLE}
              />
            ) : null}
            {trailingEdge ? (
              <LineSeries
                id="Sparkline_edge_trailing"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={'x'}
                yAccessors={['y']}
                data={trailingEdge}
                color={color}
                curve={CurveType.CURVE_MONOTONE_X}
                lineSeriesStyle={APM_DOTTED_LINE_STYLE}
              />
            ) : null}
            {interiorEdges.map((edge, i) => (
              <LineSeries
                key={`Sparkline_edge_gap_${i}`}
                id={`Sparkline_edge_gap_${i}`}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={'x'}
                yAccessors={['y']}
                data={edge}
                color={color}
                curve={CurveType.CURVE_MONOTONE_X}
                lineSeriesStyle={APM_DOTTED_LINE_STYLE}
              />
            ))}
            {mainSegments.map((segment, i) => (
              <LineSeries
                key={`Sparkline${mainSegments.length === 1 ? '' : `_seg_${i}`}`}
                id={`Sparkline${mainSegments.length === 1 ? '' : `_seg_${i}`}`}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={'x'}
                yAccessors={['y']}
                data={segment}
                color={color}
                curve={CurveType.CURVE_MONOTONE_X}
              />
            ))}
            {hasComparisonSeries && comparisonSplit ? (
              <>
                {comparisonSplit.leadingEdge ? (
                  <LineSeries
                    id="comparisonSeries_edge_leading"
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor={'x'}
                    yAccessors={['y']}
                    data={comparisonSplit.leadingEdge}
                    color={comparisonSeriesColor}
                    curve={CurveType.CURVE_MONOTONE_X}
                    lineSeriesStyle={APM_DOTTED_LINE_STYLE}
                  />
                ) : null}
                {comparisonSplit.trailingEdge ? (
                  <LineSeries
                    id="comparisonSeries_edge_trailing"
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor={'x'}
                    yAccessors={['y']}
                    data={comparisonSplit.trailingEdge}
                    color={comparisonSeriesColor}
                    curve={CurveType.CURVE_MONOTONE_X}
                    lineSeriesStyle={APM_DOTTED_LINE_STYLE}
                  />
                ) : null}
                {comparisonSplit.interiorEdges.map((edge, i) => {
                  const comparisonEdgeGapId = `comparisonSeries_edge_gap_${i}`;
                  return (
                    <LineSeries
                      key={comparisonEdgeGapId}
                      id={comparisonEdgeGapId}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor={'x'}
                      yAccessors={['y']}
                      data={edge}
                      color={comparisonSeriesColor}
                      curve={CurveType.CURVE_MONOTONE_X}
                      lineSeriesStyle={APM_DOTTED_LINE_STYLE}
                    />
                  );
                })}
                {comparisonSplit.mainSegments.map((segment, i) => {
                  const comparisonSeriesId = `comparisonSeries${
                    comparisonSplit.mainSegments.length === 1 ? '' : `_seg_${i}`
                  }`;
                  return (
                    <AreaSeries
                      key={comparisonSeriesId}
                      id={comparisonSeriesId}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor={'x'}
                      yAccessors={['y']}
                      data={segment}
                      color={comparisonSeriesColor}
                      curve={CurveType.CURVE_MONOTONE_X}
                    />
                  );
                })}
              </>
            ) : null}
          </>
        )}
      </Chart>
    );
  }

  return (
    <div
      style={{
        ...chartSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EuiIcon type="chartLine" color={euiTheme.colors.mediumShade} aria-hidden={true} />
    </div>
  );
}
