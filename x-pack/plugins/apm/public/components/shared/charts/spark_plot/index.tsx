/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  BarSeries,
  Chart,
  CurveType,
  LineSeries,
  PartialTheme,
  ScaleType,
  Settings,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingChart,
} from '@elastic/eui';
import React from 'react';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { Coordinate } from '../../../../../typings/timeseries';
import { useTheme } from '../../../../hooks/use_theme';
import { unit } from '../../../../utils/style';
import { getComparisonChartTheme } from '../../time_comparison/get_comparison_chart_theme';

function hasValidTimeseries(
  series?: Coordinate[] | null
): series is Coordinate[] {
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
      <EuiFlexItem grow={false} style={{ whiteSpace: 'nowrap' }}>
        {valueLabel}
      </EuiFlexItem>
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

function SparkPlotItem({
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
  const theme = useTheme();
  const defaultChartTheme = useChartTheme();
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
    height: theme.eui.euiSizeL,
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
        <EuiLoadingChart mono />
      </div>
    );
  }

  if (hasValidTimeseries(series)) {
    return (
      <Chart size={chartSize}>
        <Settings
          theme={[sparkplotChartTheme, ...defaultChartTheme]}
          showLegend={false}
          tooltip="none"
        />
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
            <LineSeries
              id="Sparkline"
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={'x'}
              yAccessors={['y']}
              data={series}
              color={color}
              curve={CurveType.CURVE_MONOTONE_X}
            />
            {hasComparisonSeries && (
              <AreaSeries
                id="comparisonSeries"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={'x'}
                yAccessors={['y']}
                data={comparisonSeries}
                color={comparisonSeriesColor}
                curve={CurveType.CURVE_MONOTONE_X}
              />
            )}
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
      <EuiIcon type="visLine" color={theme.eui.euiColorMediumShade} />
    </div>
  );
}
