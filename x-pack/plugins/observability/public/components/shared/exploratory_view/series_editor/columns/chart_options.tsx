/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SeriesConfig } from '../../types';
import { OperationTypeSelect } from '../../series_builder/columns/operation_type_select';
import { SeriesChartTypesSelect } from '../../series_builder/columns/chart_types';

interface Props {
  seriesConfig: SeriesConfig;
  seriesId: string;
}

export function ChartOptions({ seriesConfig, seriesId }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s" justifyContent="center">
      <EuiFlexItem grow={false}>
        <SeriesChartTypesSelect
          seriesId={seriesId}
          defaultChartType={seriesConfig.seriesTypes[0]}
        />
      </EuiFlexItem>
      {seriesConfig.hasOperationType && (
        <EuiFlexItem grow={false}>
          <OperationTypeSelect seriesId={seriesId} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
