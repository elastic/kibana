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
import { Kpi } from './kpi';
import { HostCountProvider } from '../../hooks/use_host_count';
import { HostCountKpi } from './host_count_kpi';
import { assetDetailsDashboards, KPI_CHART_HEIGHT } from '../../../../../common/visualizations';

export const KPIGrid = () => {
  return (
    <HostCountProvider>
      <HostMetricsDocsLink type="metrics" />
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="hostsViewKPIGrid">
        <EuiFlexItem>
          <HostCountKpi height={KPI_CHART_HEIGHT} />
        </EuiFlexItem>
        {assetDetailsDashboards.host.hostKPICharts.map((chartProp, index) => (
          <EuiFlexItem key={index}>
            <Kpi {...chartProp} height={KPI_CHART_HEIGHT} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </HostCountProvider>
  );
};
