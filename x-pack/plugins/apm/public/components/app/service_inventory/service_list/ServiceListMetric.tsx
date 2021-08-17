/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { Coordinate } from '../../../../../typings/timeseries';
import { SparkPlot } from '../../../shared/charts/spark_plot';

export function ServiceListMetric({
  color,
  series,
  valueLabel,
  comparisonSeries,
  hideSeries = false,
}: {
  color: 'euiColorVis1' | 'euiColorVis0' | 'euiColorVis7';
  series?: Coordinate[];
  comparisonSeries?: Coordinate[];
  valueLabel: React.ReactNode;
  hideSeries?: boolean;
}) {
  if (!hideSeries) {
    return (
      <SparkPlot
        valueLabel={valueLabel}
        series={series}
        color={color}
        comparisonSeries={comparisonSeries}
      />
    );
  }

  return (
    <EuiFlexGroup gutterSize="none" alignItems="flexEnd">
      <EuiFlexItem>
        <EuiText size="s" textAlign="right">
          {valueLabel}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
