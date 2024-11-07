/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingChart,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import { ScaleType, Settings, Tooltip, Chart, BarSeries } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { Coordinate } from '../../../common/types';

export function SparkPlot({
  valueLabel,
  isLoading,
  series,
}: {
  valueLabel: React.ReactNode;
  isLoading: boolean;
  series?: Coordinate[] | null;
}) {
  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <SparkPlotItem isLoading={isLoading} series={series} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{valueLabel}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SparkPlotItem({
  isLoading,
  series,
}: {
  isLoading: boolean;
  series?: Coordinate[] | null;
}) {
  const { euiTheme } = useEuiTheme();
  const chartSize = {
    height: euiTheme.size.l,
    width: '80px',
  };

  const commonStyle = {
    ...chartSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const palette = euiPaletteColorBlind({ rotations: 2 });

  if (isLoading) {
    return (
      <div style={commonStyle}>
        <EuiLoadingChart mono />
      </div>
    );
  }

  if (hasValidTimeSeries(series)) {
    return (
      <div
        style={{ backgroundColor: `${palette[0]}`, padding: 1, height: '100%' }}
        data-test-subj="datasetQualitySparkPlot"
      >
        <Chart size={chartSize}>
          <Settings showLegend={false} locale={i18n.getLocale()} />
          <Tooltip type="none" />
          <BarSeries
            id="barseries"
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={series}
            color={palette[1]}
          />
        </Chart>
      </div>
    );
  }

  return (
    <div style={commonStyle}>
      <EuiIcon type="visLine" color={euiTheme.colors.mediumShade} />
    </div>
  );
}

function hasValidTimeSeries(series?: Coordinate[] | null): series is Coordinate[] {
  return !!series?.some((point) => point.y !== 0);
}
