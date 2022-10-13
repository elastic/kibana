/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import React from 'react';
import { SnapshotNodeMetric } from '../../../../../common/http_api/snapshot_api';
import { NumberCell } from '../../../../components/infrastructure_node_metrics_tables/shared/components';

interface HostNodeRow extends HostMetics {
  os?: string | null | undefined;
  servicesOnHost?: number | null | undefined;
}

export interface HostMetics {
  cpuCores: SnapshotNodeMetric;
  rx: SnapshotNodeMetric;
  tx: SnapshotNodeMetric;
  memory: SnapshotNodeMetric;
  memoryTotal: SnapshotNodeMetric;
}

export const HostsTableColumns: Array<EuiBasicTableColumn<HostNodeRow>> = [
  {
    name: 'Name',
    field: 'label',
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
    render: (cpuCores: { value: number }) => <NumberCell value={cpuCores.value} />,
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
    field: 'memoryTotal',
    render: (memoryTotal: { avg: number }) => (
      <NumberCell value={Math.floor(memoryTotal.avg)} unit=" MB" />
    ),
  },
  {
    name: 'Services on Host',
    field: 'servicesOnHost',
    render: (servicesOnHost: number) => <NumberCell value={servicesOnHost} />,
  },
  {
    name: 'Memory usage (avg.)',
    field: 'memory',
    render: (memory: { avg: number }) => <NumberCell value={memory.avg} unit="%" />,
  },
];
