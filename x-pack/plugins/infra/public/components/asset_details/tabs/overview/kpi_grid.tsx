/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { Tile } from './tile';
import { KPI_CHARTS } from '../../../../common/visualizations/lens/kpi_grid_config';
import type { KPIProps } from './overview';
import type { StringDateRange } from '../../types';

export interface KPIGridProps extends KPIProps {
  nodeName: string;
  dateRange: StringDateRange;
}

export const KPIGrid = React.memo(({ nodeName, dataView, dateRange }: KPIGridProps) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        style={{ flexGrow: 0 }}
        data-test-subj="assetDetailsKPIGrid"
      >
        {KPI_CHARTS.map(({ ...chartProp }) => (
          <EuiFlexItem key={chartProp.type}>
            <Tile {...chartProp} nodeName={nodeName} dataView={dataView} dateRange={dateRange} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
});
