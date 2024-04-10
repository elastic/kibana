/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexGrid } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import { HostCharts, KubernetesCharts } from '../../../charts';
import { ContentTabIds } from '../../../types';

interface Props {
  assetId: string;
  dateRange: TimeRange;
  dataView?: DataView;
}

export const HostMetrics = (props: Props) => {
  const { showTab } = useTabSwitcherContext();

  const onClick = (metric: string) => {
    showTab(ContentTabIds.METRICS, { scrollTo: metric });
  };

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <HostCharts {...props} metric="cpu" onShowAll={onClick} overview />
      <EuiFlexGrid columns={2} gutterSize="s">
        <HostCharts {...props} metric="memory" onShowAll={onClick} overview />
        <HostCharts {...props} metric="network" onShowAll={onClick} overview />
      </EuiFlexGrid>
      <HostCharts {...props} metric="disk" onShowAll={onClick} overview />
      <KubernetesCharts {...props} onShowAll={onClick} />
    </EuiFlexGroup>
  );
};
