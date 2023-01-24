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
import { encode } from '@kbn/rison';
import { TimeRange } from '@kbn/es-query';
import type { SnapshotMetricInput, SnapshotNodeMetric } from '../../../../../common/http_api';
import { createInventoryMetricFormatter } from '../../inventory_view/lib/create_inventory_metric_formatter';
import { CloudProviderIconWithTitle } from './cloud_provider_icon_with_title';
import { TruncateLinkWithTooltip } from './truncate_link_with_tooltip';

interface HostNodeRow extends HostMetrics {
  os?: string | null;
  servicesOnHost?: number | null;
  title: { name: string; cloudProvider?: string | null };
  name: string;
}

export interface HostMetrics {
  cpuCores: SnapshotNodeMetric;
  diskLatency: SnapshotNodeMetric;
  rx: SnapshotNodeMetric;
  tx: SnapshotNodeMetric;
  memory: SnapshotNodeMetric;
  memoryTotal: SnapshotNodeMetric;
}

const formatMetric = (type: SnapshotMetricInput['type'], value: number | undefined | null) =>
  value || value === 0 ? createInventoryMetricFormatter({ type })(value) : 'N/A';

interface HostBuilderParams {
  time: TimeRange;
}

export const buildHostsTableColumns = ({
  time,
}: HostBuilderParams): Array<EuiBasicTableColumn<HostNodeRow>> => {
  const hostLinkSearch = {
    _a: encode({ time: { ...time, interval: '>=1m' } }),
  };

  return [
    {
      name: i18n.translate('xpack.infra.hostsTable.nameColumnHeader', {
        defaultMessage: 'Name',
      }),
      field: 'title',
      sortable: true,
      truncateText: true,
      render: (title: HostNodeRow['title']) => (
        <CloudProviderIconWithTitle
          provider={title?.cloudProvider}
          text={title.name}
          title={
            <TruncateLinkWithTooltip
              text={title.name}
              linkProps={{
                app: 'metrics',
                pathname: `/detail/host/${title.name}`,
                search: hostLinkSearch,
              }}
            />
          }
        />
      ),
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
      align: 'right',
    },
    {
      name: i18n.translate('xpack.infra.hostsTable.diskLatencyColumnHeader', {
        defaultMessage: 'Disk Latency (avg.)',
      }),
      field: 'diskLatency.avg',
      sortable: true,
      render: (avg: number) => <>{formatMetric('diskLatency', avg)}</>,
      align: 'right',
    },
    {
      name: i18n.translate('xpack.infra.hostsTable.averageTxColumnHeader', {
        defaultMessage: 'TX (avg.)',
      }),
      field: 'tx.avg',
      sortable: true,
      render: (avg: number) => <>{formatMetric('tx', avg)}</>,
      align: 'right',
    },
    {
      name: i18n.translate('xpack.infra.hostsTable.averageRxColumnHeader', {
        defaultMessage: 'RX (avg.)',
      }),
      field: 'rx.avg',
      sortable: true,
      render: (avg: number) => <>{formatMetric('rx', avg)}</>,
      align: 'right',
    },
    {
      name: i18n.translate('xpack.infra.hostsTable.averageMemoryTotalColumnHeader', {
        defaultMessage: 'Memory total (avg.)',
      }),
      field: 'memoryTotal.avg',
      sortable: true,
      render: (avg: number) => <>{formatMetric('memoryTotal', avg)}</>,
      align: 'right',
    },
    {
      name: i18n.translate('xpack.infra.hostsTable.averageMemoryUsageColumnHeader', {
        defaultMessage: 'Memory usage (avg.)',
      }),
      field: 'memory.avg',
      sortable: true,
      render: (avg: number) => <>{formatMetric('memory', avg)}</>,
      align: 'right',
    },
  ];
};
