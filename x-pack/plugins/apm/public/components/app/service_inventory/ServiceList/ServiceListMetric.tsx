/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { SparkPlotWithValueLabel } from '../../../shared/charts/spark_plot/spark_plot_with_value_label';

export function ServiceListMetric({
  color,
  series,
  valueLabel,
}: {
  color: 'euiColorVis1' | 'euiColorVis0' | 'euiColorVis7';
  series?: Array<{ x: number; y: number | null }>;
  valueLabel: React.ReactNode;
}) {
  const {
    urlParams: { start, end },
  } = useUrlParams();

  return (
    <SparkPlotWithValueLabel
      start={parseFloat(start!)}
      end={parseFloat(end!)}
      valueLabel={valueLabel}
      series={series}
      color={color}
    />
  );
}
