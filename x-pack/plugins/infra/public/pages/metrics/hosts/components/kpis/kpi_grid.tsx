/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { HostMetricsDocsLink } from '../../../../../components/lens';
import { Tile } from './tile';
import { HostCountProvider } from '../../hooks/use_host_count';
import { HostsTile } from './hosts_tile';
import { KPI_CHART_MIN_HEIGHT } from '../../constants';
import { KPI_CHARTS } from '../../../../../common/visualizations/lens/dashboards/host/kpi_grid_config';

export const KPIGrid = () => {
  return (
    <HostCountProvider>
      <HostMetricsDocsLink />
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="hostsViewKPIGrid">
        <EuiFlexItem>
          <HostsTile height={KPI_CHART_MIN_HEIGHT} />
        </EuiFlexItem>
        {KPI_CHARTS.map((chartProp, index) => (
          <EuiFlexItem key={index}>
            <Tile {...chartProp} height={KPI_CHART_MIN_HEIGHT} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </HostCountProvider>
  );
};
