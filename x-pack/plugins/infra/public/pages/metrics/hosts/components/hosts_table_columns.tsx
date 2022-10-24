/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { scaleUpPercentage } from '../../../../components/infrastructure_node_metrics_tables/shared/hooks';
import type { SnapshotNodeMetric } from '../../../../../common/http_api/snapshot_api';
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
    name: i18n.translate('xpack.infra.hostsTable.nameColumnHeader', {
      defaultMessage: 'Name',
    }),
    field: 'label',
    truncateText: true,
    textOnly: true,
    render: (name: string) => <EuiText size="s">{name}</EuiText>,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.operatingSystemColumnHeader', {
      defaultMessage: 'Operating System',
    }),
    field: 'os',
    render: (os: string) => <EuiText size="s">{os ?? '-'}</EuiText>,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.numberOfCpusColumnHeader', {
      defaultMessage: '# of CPUs',
    }),
    field: 'cpuCores',
    render: (cpuCores: { value: number }) => <NumberCell value={cpuCores.value} />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.diskLatencyColumnHeader', {
      defaultMessage: 'Disk Latency',
    }),
    field: 'diskLatency',
    render: (ds: number) => <NumberCell value={ds} unit=" ms" />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageTxColumnHeader', {
      defaultMessage: 'TX (avg.)',
    }),
    field: 'tx',
    render: (tx: { avg: number }) => <NumberCell value={tx.avg} />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageRxColumnHeader', {
      defaultMessage: 'RX (avg.)',
    }),
    field: 'rx',
    render: (rx: { avg: number }) => <NumberCell value={rx.avg} />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageMemoryTotalColumnHeader', {
      defaultMessage: 'Memory total (avg.)',
    }),
    field: 'memoryTotal',
    render: (memoryTotal: { avg: number }) => (
      <NumberCell value={Math.floor(memoryTotal.avg)} unit=" MB" />
    ),
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.servicesOnHostColumnHeader', {
      defaultMessage: 'Services on Host',
    }),
    field: 'servicesOnHost',
    render: (servicesOnHost: number) => <NumberCell value={servicesOnHost} />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageMemoryUsageColumnHeader', {
      defaultMessage: 'Memory usage (avg.)',
    }),
    field: 'memory',
    render: (memory: { avg: number }) => (
      <NumberCell value={scaleUpPercentage(memory.avg)} unit="%" />
    ),
  },
];
