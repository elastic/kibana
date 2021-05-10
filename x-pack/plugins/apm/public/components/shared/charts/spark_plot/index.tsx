/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import {
  AreaSeries,
  Chart,
  CurveType,
  LineSeries,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { merge } from 'lodash';
import { Coordinate } from '../../../../../typings/timeseries';
import { useChartTheme } from '../../../../../../observability/public';
import { px, unit } from '../../../../style/variables';
import { useTheme } from '../../../../hooks/use_theme';
import { getComparisonChartTheme } from '../../time_comparison/get_time_range_comparison';

export type Color =
  | 'euiColorVis0'
  | 'euiColorVis1'
  | 'euiColorVis2'
  | 'euiColorVis3'
  | 'euiColorVis4'
  | 'euiColorVis5'
  | 'euiColorVis6'
  | 'euiColorVis7'
  | 'euiColorVis8'
  | 'euiColorVis9';

function hasValidTimeseries(
  series?: Coordinate[] | null
): series is Coordinate[] {
  return !!series?.some((point) => point.y !== null);
}

export function SparkPlot({
  color,
  series,
  comparisonSeries = [],
  valueLabel,
  compact,
}: {
  color: Color;
  series?: Coordinate[] | null;
  valueLabel: React.ReactNode;
  compact?: boolean;
  comparisonSeries?: Coordinate[];
}) {
  const theme = useTheme();
  const defaultChartTheme = useChartTheme();
  const comparisonChartTheme = getComparisonChartTheme(theme);
  const hasComparisonSeries = !!comparisonSeries?.length;

  const sparkplotChartTheme = merge({}, defaultChartTheme, {
    chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
    lineSeriesStyle: {
      point: { opacity: 0 },
    },
    areaSeriesStyle: {
      point: { opacity: 0 },
    },
    ...(hasComparisonSeries ? comparisonChartTheme : {}),
  });

  const colorValue = theme.eui[color];

  const chartSize = {
    height: px(24),
    width: compact ? px(unit * 3) : px(unit * 4),
  };

  const Sparkline = hasComparisonSeries ? LineSeries : AreaSeries;

  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        {hasValidTimeseries(series) ? (
          <Chart size={chartSize}>
            <Settings
              theme={sparkplotChartTheme}
              showLegend={false}
              tooltip="none"
            />
            <Sparkline
              id="Sparkline"
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={'x'}
              yAccessors={['y']}
              data={series}
              color={colorValue}
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
                color={theme.eui.euiColorLightestShade}
                curve={CurveType.CURVE_MONOTONE_X}
              />
            )}
          </Chart>
        ) : (
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
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ whiteSpace: 'nowrap' }}>
        {valueLabel}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
