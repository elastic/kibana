/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DataSeries } from '../../types';
import { OperationTypeSelect } from '../../series_builder/columns/operation_type_select';
import { SeriesChartTypesSelect } from '../../series_builder/columns/chart_types';

interface Props {
  series: DataSeries;
  seriesId: string;
}

export function ChartOptions({ series, seriesId }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s" justifyContent="center">
      <EuiFlexItem grow={false}>
        <SeriesChartTypesSelect seriesId={seriesId} defaultChartType={series.seriesTypes[0]} />
      </EuiFlexItem>
      {series.hasOperationType && (
        <EuiFlexItem grow={false}>
          <OperationTypeSelect seriesId={seriesId} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
