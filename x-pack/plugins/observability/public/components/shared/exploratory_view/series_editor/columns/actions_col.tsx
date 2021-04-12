/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DataSeries } from '../../types';
import { SeriesChartTypes } from './chart_types';
import { MetricSelection } from './metric_selection';

interface Props {
  series: DataSeries;
}

export function ActionsCol({ series }: Props) {
  return (
    <EuiFlexGroup direction="row" gutterSize="s" justifyContent="center">
      <EuiFlexItem grow={false}>
        <SeriesChartTypes seriesId={series.id} defaultChartType={series.seriesTypes[0]} />
      </EuiFlexItem>
      {series.hasMetricType && (
        <EuiFlexItem grow={false}>
          <MetricSelection seriesId={series.id} isDisabled={!series.hasMetricType} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
