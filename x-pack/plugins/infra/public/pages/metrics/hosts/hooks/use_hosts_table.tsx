/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBasicTableColumn, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { v4 as uuidv4 } from 'uuid';

import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { createInventoryMetricFormatter } from '../../inventory_view/lib/create_inventory_metric_formatter';
import { HostsTableEntryTitle } from '../components/hosts_table_entry_title';
import type {
  SnapshotNode,
  SnapshotNodeMetric,
  SnapshotMetricInput,
} from '../../../../../common/http_api';

/**
 * Columns and items types
 */
export type CloudProvider = 'gcp' | 'aws' | 'azure' | 'unknownProvider';

type HostMetric = 'cpu' | 'diskLatency' | 'rx' | 'tx' | 'memory' | 'memoryTotal';

type HostMetrics = Record<HostMetric, SnapshotNodeMetric>;

export interface HostNodeRow extends HostMetrics {
  os?: string | null;
  servicesOnHost?: number | null;
  title: { name: string; cloudProvider?: CloudProvider | null };
  name: string;
  uuid: string;
}

interface HostTableParams {
  time: TimeRange;
}

/**
 * Helper functions
 */
const formatMetric = (type: SnapshotMetricInput['type'], value: number | undefined | null) => {
  return value || value === 0 ? createInventoryMetricFormatter({ type })(value) : 'N/A';
};

const buildItemsList = (nodes: SnapshotNode[]) => {
  return nodes.map(({ metrics, path, name }) => ({
    uuid: uuidv4(),
    name,
    os: path.at(-1)?.os ?? '-',
    title: {
      name,
      cloudProvider: path.at(-1)?.cloudProvider ?? null,
    },
    ...metrics.reduce((data, metric) => {
      data[metric.name as HostMetric] = metric;
      return data;
    }, {} as HostMetrics),
  })) as HostNodeRow[];
};

/**
 * Columns translations
 */
const titleLabel = i18n.translate('xpack.infra.hostsViewPage.table.nameColumnHeader', {
  defaultMessage: 'Name',
});

const osLabel = i18n.translate('xpack.infra.hostsViewPage.table.operatingSystemColumnHeader', {
  defaultMessage: 'Operating System',
});

const averageCpuUsageLabel = i18n.translate(
  'xpack.infra.hostsViewPage.table.averageCpuUsageColumnHeader',
  {
    defaultMessage: 'CPU usage (avg.)',
  }
);

const diskLatencyLabel = i18n.translate('xpack.infra.hostsViewPage.table.diskLatencyColumnHeader', {
  defaultMessage: 'Disk Latency (avg.)',
});

const averageTXLabel = i18n.translate('xpack.infra.hostsViewPage.table.averageTxColumnHeader', {
  defaultMessage: 'TX (avg.)',
});

const averageRXLabel = i18n.translate('xpack.infra.hostsViewPage.table.averageRxColumnHeader', {
  defaultMessage: 'RX (avg.)',
});

const averageTotalMemoryLabel = i18n.translate(
  'xpack.infra.hostsViewPage.table.averageMemoryTotalColumnHeader',
  {
    defaultMessage: 'Memory total (avg.)',
  }
);

const averageMemoryUsageLabel = i18n.translate(
  'xpack.infra.hostsViewPage.table.averageMemoryUsageColumnHeader',
  {
    defaultMessage: 'Memory usage (avg.)',
  }
);

const toggleDialogActionLabel = i18n.translate(
  'xpack.infra.hostsViewPage.table.toggleDialogWithDetails',
  {
    defaultMessage: 'Toggle dialog with details',
  }
);

/**
 * Build a table columns and items starting from the snapshot nodes.
 */
export const useHostsTable = (nodes: SnapshotNode[], { time }: HostTableParams) => {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [clickedItemUuid, setClickedItemUuid] = useState(() => uuidv4());

  const closeFlyout = () => setIsFlyoutOpen(false);

  const reportHostEntryClick = useCallback(
    ({ name, cloudProvider }: HostNodeRow['title']) => {
      telemetry.reportHostEntryClicked({
        hostname: name,
        cloud_provider: cloudProvider,
      });
    },
    [telemetry]
  );

  const items = useMemo(() => buildItemsList(nodes), [nodes]);

  const columns: Array<EuiBasicTableColumn<HostNodeRow>> = useMemo(
    () => [
      {
        name: '',
        width: '40px',
        field: 'uuid',
        actions: [
          {
            name: toggleDialogActionLabel,
            description: toggleDialogActionLabel,
            icon: ({ uuid }) => (isFlyoutOpen && uuid === clickedItemUuid ? 'minimize' : 'expand'),
            type: 'icon',
            onClick: ({ uuid }) => {
              setClickedItemUuid(uuid);
              if (isFlyoutOpen && uuid === clickedItemUuid) {
                setIsFlyoutOpen(false);
              } else {
                setIsFlyoutOpen(true);
              }
            },
          },
        ],
      },
      {
        name: titleLabel,
        field: 'title',
        sortable: true,
        truncateText: true,
        render: (title: HostNodeRow['title']) => (
          <HostsTableEntryTitle
            title={title}
            time={time}
            onClick={() => reportHostEntryClick(title)}
          />
        ),
      },
      {
        name: osLabel,
        field: 'os',
        sortable: true,
        render: (os: string) => <EuiText size="s">{os}</EuiText>,
      },
      {
        name: averageCpuUsageLabel,
        field: 'cpu.avg',
        sortable: true,
        render: (avg: number) => formatMetric('cpu', avg),
        align: 'right',
      },
      {
        name: diskLatencyLabel,
        field: 'diskLatency.avg',
        sortable: true,
        render: (avg: number) => formatMetric('diskLatency', avg),
        align: 'right',
      },
      {
        name: averageRXLabel,
        field: 'rx.avg',
        sortable: true,
        render: (avg: number) => formatMetric('rx', avg),
        align: 'right',
      },
      {
        name: averageTXLabel,
        field: 'tx.avg',
        sortable: true,
        render: (avg: number) => formatMetric('tx', avg),
        align: 'right',
      },
      {
        name: averageTotalMemoryLabel,
        field: 'memoryTotal.avg',
        sortable: true,
        render: (avg: number) => formatMetric('memoryTotal', avg),
        align: 'right',
      },
      {
        name: averageMemoryUsageLabel,
        field: 'memory.avg',
        sortable: true,
        render: (avg: number) => formatMetric('memory', avg),
        align: 'right',
      },
    ],
    [clickedItemUuid, isFlyoutOpen, reportHostEntryClick, time]
  );

  return { columns, items, isFlyoutOpen, closeFlyout, clickedItemUuid };
};
