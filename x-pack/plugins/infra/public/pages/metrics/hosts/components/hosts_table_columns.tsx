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
import type { SnapshotMetricInput, SnapshotNodeMetric } from '../../../../../common/http_api';
import { createInventoryMetricFormatter } from '../../inventory_view/lib/create_inventory_metric_formatter';

interface HostNodeRow extends HostMetics {
  os?: string | null;
  servicesOnHost?: number | null;
  name: string;
}

export interface HostMetics {
  cpuCores: SnapshotNodeMetric;
  diskLatency: SnapshotNodeMetric;
  rx: SnapshotNodeMetric;
  tx: SnapshotNodeMetric;
  memory: SnapshotNodeMetric;
  memoryTotal: SnapshotNodeMetric;
}

const formatMetric = (type: SnapshotMetricInput['type'], value: number | undefined | null) =>
  value || value === 0 ? createInventoryMetricFormatter({ type })(value) : 'N/A';

export const HostsTableColumns: Array<EuiBasicTableColumn<HostNodeRow>> = [
  {
    name: i18n.translate('xpack.infra.hostsTable.nameColumnHeader', {
      defaultMessage: 'Name',
    }),
    field: 'name',
    sortable: true,
    truncateText: true,
    textOnly: true,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.operatingSystemColumnHeader', {
      defaultMessage: 'Operating System',
    }),
    field: 'os',
    sortable: true,
    render: (os: string) => <EuiText size="s">{os}</EuiText>,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.numberOfCpusColumnHeader', {
      defaultMessage: '# of CPUs',
    }),
    field: 'cpuCores',
    sortable: true,
    render: (cpuCores: SnapshotNodeMetric) => (
      <>{formatMetric('cpuCores', cpuCores?.value ?? cpuCores?.max)}</>
    ),
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.diskLatencyColumnHeader', {
      defaultMessage: 'Disk Latency (avg.)',
    }),
    field: 'diskLatency.avg',
    sortable: true,
    render: (avg: number) => <>{formatMetric('diskLatency', avg)}</>,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageTxColumnHeader', {
      defaultMessage: 'TX (avg.)',
    }),
    field: 'tx.avg',
    sortable: true,
    render: (avg: number) => <>{formatMetric('tx', avg)}</>,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageRxColumnHeader', {
      defaultMessage: 'RX (avg.)',
    }),
    field: 'rx.avg',
    sortable: true,
    render: (avg: number) => <>{formatMetric('rx', avg)}</>,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageMemoryTotalColumnHeader', {
      defaultMessage: 'Memory total (avg.)',
    }),
    field: 'memoryTotal.avg',
    sortable: true,
    render: (avg: number) => <>{formatMetric('memoryTotal', avg)}</>,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.servicesOnHostColumnHeader', {
      defaultMessage: 'Services on Host',
    }),
    field: 'servicesOnHost',
    sortable: true,
    render: (servicesOnHost: number) => <>{formatMetric('cpuCores', servicesOnHost)}</>,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageMemoryUsageColumnHeader', {
      defaultMessage: 'Memory usage (avg.)',
    }),
    field: 'memory.avg',
    sortable: true,
    render: (avg: number) => <>{formatMetric('memory', avg)}</>,
  },
];
