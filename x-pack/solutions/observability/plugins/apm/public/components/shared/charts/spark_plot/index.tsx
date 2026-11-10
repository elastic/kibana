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
import React, { useMemo } from 'react';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { unit } from '@kbn/apm-common';
import type { Coordinate } from '../../../../../typings/timeseries';
import { getComparisonChartTheme } from '../../time_comparison/get_comparison_chart_theme';
import {
  APM_DOTTED_LINE_STYLE,
  splitSeriesAtNullGaps,
  trimPartialTrailingBucket,
} from '../utils/timeseries_gap_handling';

function hasValidTimeseries(series?: Coordinate[] | null): series is Coordinate[] {
  return !!series?.some((point) => point.y !== null);
}

const flexGroupStyle = { overflow: 'hidden' };

// Stable default so the trimming memo in SparkPlotItem is not invalidated by a
// fresh array on every render.
const EMPTY_COMPARISON_SERIES: Coordinate[] = [];

type SparkPlotType = 'line' | 'bar';

export function SparkPlot({
  type = 'line',
  color,
  isLoading,
  series,
  comparisonSeries = EMPTY_COMPARISON_SERIES,
  valueLabel,
  compact,
  comparisonSeriesColor,
  end,
}: {
  type?: SparkPlotType;
  color: string;
  isLoading: boolean;
  series?: Coordinate[] | null;
  valueLabel: React.ReactNode;
  compact?: boolean;
  comparisonSeries?: Coordinate[];
  comparisonSeriesColor?: string;
  // Range end (epoch ms). When set, the partial trailing bucket is trimmed; when
  // undefined nothing is trimmed, so callers that do not pass it are unaffected.
  end?: number;
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
          end={end}
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
  end,
}: {
  type?: SparkPlotType;
  color: string;
  isLoading: boolean;
  series?: Coordinate[] | null;
  compact?: boolean;
  comparisonSeries?: Coordinate[];
  comparisonSeriesColor?: string;
  // Range end (epoch ms). When set, the partial trailing bucket is trimmed.
  end?: number;
}) {
  const { euiTheme } = useEuiTheme();
  const defaultChartThemes = useChartThemes();
  const comparisonChartTheme = getComparisonChartTheme();

  // Decide the cut once from the main series and apply it to both series, so the
  // main and comparison lines always end on the same bucket. If trimming would
  // leave no valid points (a service reporting only in its latest, partial
  // bucket) keep the untrimmed series so the row still shows a chart. This must
  // sit above the isLoading early return to satisfy the rules of hooks.
  const { trimmedSeries, trimmedComparisonSeries } = useMemo(() => {
    const untrimmed = { trimmedSeries: series, trimmedComparisonSeries: comparisonSeries };
    if (end === undefined || !series) {
      return untrimmed;
    }
    const trimmed = trimPartialTrailingBucket(series, end);
    const didTrim = trimmed.length < series.length;
    if (!didTrim || !hasValidTimeseries(trimmed)) {
      return untrimmed;
    }
    // comparisonSeries x values are already shifted onto the current period
    // (detailed-statistics route), so dropping its last point applies the same
    // cut as the main series.
    return {
      trimmedSeries: trimmed,
      trimmedComparisonSeries: comparisonSeries?.slice(0, -1),
    };
  }, [series, comparisonSeries, end]);

  const hasComparisonSeries = !!trimmedComparisonSeries?.length;

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

  if (hasValidTimeseries(trimmedSeries)) {
    const { mainSegments, leadingEdge, trailingEdge, interiorEdges } =
      splitSeriesAtNullGaps(trimmedSeries);

    const comparisonSplit =
      hasComparisonSeries && trimmedComparisonSeries
        ? splitSeriesAtNullGaps(trimmedComparisonSeries)
        : null;

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
              data={trimmedSeries}
              color={color}
            />
            {hasComparisonSeries && (
              <BarSeries
                id="comparisonBarSeries"
                xScaleType={ScaleType.Linear}
                yScaleType={ScaleType.Linear}
                xAccessor={'x'}
                yAccessors={['y']}
                data={trimmedComparisonSeries}
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
