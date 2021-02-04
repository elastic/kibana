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
  ScaleType,
  Settings,
} from '@elastic/charts';
import { merge } from 'lodash';
import { Coordinate } from '../../../../../typings/timeseries';
import { useChartTheme } from '../../../../../../observability/public';
import { px, unit } from '../../../../style/variables';
import { useTheme } from '../../../../hooks/use_theme';

type Color =
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

export function SparkPlot({
  color,
  series,
  valueLabel,
  compact,
}: {
  color: Color;
  series?: Coordinate[] | null;
  valueLabel: React.ReactNode;
  compact?: boolean;
}) {
  const theme = useTheme();
  const defaultChartTheme = useChartTheme();

  const sparkplotChartTheme = merge({}, defaultChartTheme, {
    chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
    lineSeriesStyle: {
      point: { opacity: 0 },
    },
    areaSeriesStyle: {
      point: { opacity: 0 },
    },
  });

  const colorValue = theme.eui[color];

  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        {!series || series.every((point) => point.y === null) ? (
          <EuiIcon type="visLine" color="subdued" />
        ) : (
          <Chart
            size={{
              height: px(24),
              width: compact ? px(unit * 3) : px(unit * 4),
            }}
          >
            <Settings
              theme={sparkplotChartTheme}
              showLegend={false}
              tooltip="none"
            />
            <AreaSeries
              id="area"
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={'x'}
              yAccessors={['y']}
              data={series}
              color={colorValue}
              curve={CurveType.CURVE_MONOTONE_X}
            />
          </Chart>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ whiteSpace: 'nowrap' }}>
        {valueLabel}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
