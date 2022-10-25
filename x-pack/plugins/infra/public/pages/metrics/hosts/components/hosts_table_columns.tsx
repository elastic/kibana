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
import { NumberCell } from '../../../../components/infrastructure_node_metrics_tables/shared/components';

export interface HostNodeRow extends HostMetics {
  os?: string | null;
  servicesOnHost?: number | null;
  name: string;
}

export interface HostMetics {
  cpuCores: number | null | undefined;
  rx: number | null | undefined;
  tx: number | null | undefined;
  memory: number | null | undefined;
  memoryTotal: number | null | undefined;
}

export const HostsTableColumns: Array<EuiBasicTableColumn<HostNodeRow>> = [
  {
    name: i18n.translate('xpack.infra.hostsTable.nameColumnHeader', {
      defaultMessage: 'Name',
    }),
    field: 'name',
    sortable: true,
    truncateText: true,
    textOnly: true,
    render: (name: string) => <EuiText size="s">{name}</EuiText>,
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
    render: (cpuCores: number) => <NumberCell value={cpuCores} />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.diskLatencyColumnHeader', {
      defaultMessage: 'Disk Latency',
    }),
    field: 'diskLatency',
    sortable: true,
    render: (ds: number) => <NumberCell value={ds} unit=" ms" />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageTxColumnHeader', {
      defaultMessage: 'TX (avg.)',
    }),
    field: 'tx',
    sortable: true,
    render: (tx: number) => <NumberCell value={tx} />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageRxColumnHeader', {
      defaultMessage: 'RX (avg.)',
    }),
    field: 'rx',
    sortable: true,
    render: (rx: number) => <NumberCell value={rx} />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageMemoryTotalColumnHeader', {
      defaultMessage: 'Memory total (avg.)',
    }),
    field: 'memoryTotal',
    sortable: true,
    render: (memoryTotal: number) => <NumberCell value={Math.floor(memoryTotal)} unit=" MB" />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.servicesOnHostColumnHeader', {
      defaultMessage: 'Services on Host',
    }),
    field: 'servicesOnHost',
    sortable: true,
    render: (servicesOnHost: number) => <NumberCell value={servicesOnHost} />,
  },
  {
    name: i18n.translate('xpack.infra.hostsTable.averageMemoryUsageColumnHeader', {
      defaultMessage: 'Memory usage (avg.)',
    }),
    field: 'memory',
    sortable: true,
    render: (memory: number) => <NumberCell value={scaleUpPercentage(memory)} unit="%" />,
  },
];
