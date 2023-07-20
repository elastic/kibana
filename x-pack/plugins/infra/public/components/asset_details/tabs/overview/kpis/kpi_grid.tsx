/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Tile, type TileProps } from './tile';
import { KPI_CHARTS } from '../../../../../common/visualizations/lens/dashboards/host/kpi_grid_config';

export const KPIGrid = React.memo(({ nodeName, dataView, timeRange: dateRange }: TileProps) => {
  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="assetDetailsKPIGrid">
        {KPI_CHARTS.map((chartProp, index) => (
          <EuiFlexItem key={index}>
            <Tile {...chartProp} nodeName={nodeName} dataView={dataView} timeRange={dateRange} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
});
