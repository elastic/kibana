/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import React from 'react';
import { NumberCell } from '../../../../components/infrastructure_node_metrics_tables/shared/components';

export interface HostNodeRow {
  name: string;
  cpuCores: number | null;
  os: string;
  rx: {
    avg: number | null;
  };
  tx: {
    avg: number | null;
  };
  memory: {
    avg: number | null;
  };
  servicesOnHost: number | null;
  averageMemoryUsagePercent: number | null;
}

export const HostsTableColumns: Array<EuiBasicTableColumn<HostNodeRow>> = [
  {
    name: 'Name',
    field: 'name',
    truncateText: true,
    render: (name: string) => <div>{name}</div>,
  },
  {
    name: 'Operating System',
    field: 'os',
    render: (os: string) => <div>{os}</div>,
  },
  {
    name: '# of CPUs',
    field: 'cpuCores',
    render: (cpuCores: number) => <NumberCell value={cpuCores} />,
  },
  {
    name: 'Disk Latency',
    field: 'cpuCores',
    render: (ds: number) => <NumberCell value={ds} unit=" ms" />,
  },
  {
    name: 'TX (avg.)',
    field: 'tx',
    render: (tx: { avg: number }) => <NumberCell value={tx.avg} />,
  },
  {
    name: 'RX (avg.)',
    field: 'rx',
    render: (rx: { avg: number }) => <NumberCell value={rx.avg} />,
  },
  {
    name: 'Memory total (avg.)',
    field: 'memory',
    render: (memory: { avg: number }) => <NumberCell value={memory.avg} unit=" MB" />,
  },
  {
    name: 'Services on Host',
    field: 'servicesOnHost',
    render: (servicesOnHost: number) => <NumberCell value={servicesOnHost} />,
  },
  {
    name: 'Memory usage (avg.)',
    field: 'averageMemoryUsagePercent',
    render: (averageMemoryUsagePercent: number) => (
      <NumberCell value={averageMemoryUsagePercent} unit="%" />
    ),
  },
];
