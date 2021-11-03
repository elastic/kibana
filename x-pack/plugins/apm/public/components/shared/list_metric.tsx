/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { ComponentProps } from 'react';
import { SparkPlot } from './charts/spark_plot';

interface ListMetricProps extends ComponentProps<typeof SparkPlot> {
  hideSeries?: boolean;
}

export function ListMetric(props: ListMetricProps) {
  const { hideSeries, ...sparkPlotProps } = props;
  const { valueLabel } = sparkPlotProps;

  if (!hideSeries) {
    return <SparkPlot {...sparkPlotProps} />;
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
