/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { CSSProperties } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { hostLensFormulas } from '../../../../../common/visualizations';
import { KPIChartProps, Tile } from './tile';
import { HostCountProvider } from '../../hooks/use_host_count';
import { TOOLTIP } from '../../translations';
import { HostsTile } from './hosts_tile';
import { HostMetricsDocsLink } from '../metric_explanation/host_metrics_docs_link';
import { KPI_CHART_MIN_HEIGHT } from '../../constants';

const lensStyle: CSSProperties = {
  height: KPI_CHART_MIN_HEIGHT,
};

const KPI_CHARTS: KPIChartProps[] = [
  {
    id: 'hostsViewKPIGridCpuUsageTile',
    layers: {
      data: {
        ...hostLensFormulas.cpuUsage,
        format: {
          ...hostLensFormulas.cpuUsage.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#F1D86F',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.cpuUsage,
    'data-test-subj': 'hostsViewKPI-cpuUsage',
  },
  {
    id: 'hostsViewKPIGridNormalizedLoad1mTile',
    layers: {
      data: {
        ...hostLensFormulas.normalizedLoad1m,
        format: {
          ...hostLensFormulas.normalizedLoad1m.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#79AAD9',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.normalizedLoad1m,
    'data-test-subj': 'hostsViewKPI-normalizedLoad1m',
  },
  {
    id: 'hostsViewKPIGridMemoryUsageTile',
    layers: {
      data: {
        ...hostLensFormulas.memoryUsage,
        format: {
          ...hostLensFormulas.memoryUsage.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#A987D1',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.memoryUsage,
    'data-test-subj': 'hostsViewKPI-memoryUsage',
  },
  {
    id: 'hostsViewKPIGridDiskSpaceUsageTile',
    layers: {
      data: {
        ...hostLensFormulas.diskSpaceUsage,
        format: {
          ...hostLensFormulas.diskSpaceUsage.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#F5A35C',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.diskSpaceUsage,
    'data-test-subj': 'hostsViewKPI-diskSpaceUsage',
  },
];

export const KPIGrid = () => {
  return (
    <HostCountProvider>
      <HostMetricsDocsLink />
      <EuiSpacer size="s" />
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        style={{ flexGrow: 0 }}
        data-test-subj="hostsViewKPIGrid"
      >
        <EuiFlexItem>
          <HostsTile style={lensStyle} />
        </EuiFlexItem>
        {KPI_CHARTS.map((chartProp, index) => (
          <EuiFlexItem key={index}>
            <Tile {...chartProp} style={lensStyle} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </HostCountProvider>
  );
};
