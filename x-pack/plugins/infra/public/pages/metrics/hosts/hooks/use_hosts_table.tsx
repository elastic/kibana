/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { v4 as uuidv4 } from 'uuid';

import { isEqual } from 'lodash';
import { CriteriaWithPagination } from '@elastic/eui';
import { HostMetrics, HostMetricsItem } from '../../../../../common/http_api/hosts';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { createInventoryMetricFormatter } from '../../inventory_view/lib/create_inventory_metric_formatter';
import { HostsTableEntryTitle } from '../components/hosts_table_entry_title';
import { useTableProperties } from './use_table_properties_url_state';
import { useHostsViewContext } from './use_hosts_view';

const METADATA_ATTRIBUTE_NAME = {
  'cloud.provider': 'cloudProvider',
  'host.os.name': 'os',
};

/**
 * Columns and items types
 */
export type CloudProvider = 'gcp' | 'aws' | 'azure' | 'unknownProvider';
type HostValueByMetricType = Record<HostMetrics['name'], HostMetrics['value']> & {
  name: { name: string; cloudProvider?: CloudProvider | null };
};

export interface HostNodeRow extends HostValueByMetricType {
  os?: string | null;
  servicesOnHost?: number | null;
  uuid: string;
}

interface HostTableParams {
  time: TimeRange;
}

/**
 * Helper functions
 */
const formatMetric = (type: HostMetrics['name'], value: number | undefined | null) => {
  return value || value === 0 ? createInventoryMetricFormatter({ type })(value) : 'N/A';
};

const buildItemsList = (nodes: HostMetricsItem[]): HostNodeRow[] => {
  return nodes.map(({ metrics, metadata, name }) => ({
    uuid: uuidv4(),
    ...metadata.reduce(
      (acc, meta) => ({
        ...acc,
        name: {
          ...acc.name,
          [METADATA_ATTRIBUTE_NAME[meta.name]]: meta.value,
        },
      }),
      { name: { name } } as HostValueByMetricType
    ),

    ...metrics.reduce(
      (acc, metric) => ({ ...acc, [metric.name]: metric.value }),
      {} as HostValueByMetricType
    ),
  }));
};

/**
 * Columns translations
 */
const titleLabel = i18n.translate('xpack.infra.hostsViewPage.table.nameColumnHeader', {
  defaultMessage: 'Name',
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
export const useHostsTable = (nodes: HostMetricsItem[], { time }: HostTableParams) => {
  const { fetch } = useHostsViewContext();
  const [properties, setProperties] = useTableProperties();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [clickedItemUuid, setClickedItemUuid] = useState(() => uuidv4());

  const closeFlyout = () => setIsFlyoutOpen(false);

  const reportHostEntryClick = useCallback(
    ({ name, cloudProvider }: HostNodeRow['name']) => {
      telemetry.reportHostEntryClicked({
        hostname: name,
        cloud_provider: cloudProvider,
      });
    },
    [telemetry]
  );

  const items = useMemo(() => buildItemsList(nodes), [nodes]);
  const sortableFields = useMemo(() => new Set(items.flatMap((p) => Object.keys(p))), [items]);

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
        field: 'name',
        sortable: true,
        truncateText: true,
        'data-test-subj': 'hostsView-tableRow-title',
        render: (title: HostNodeRow['name']) => (
          <HostsTableEntryTitle
            title={title}
            time={time}
            onClick={() => reportHostEntryClick(title)}
          />
        ),
      },
      {
        name: averageCpuUsageLabel,
        field: 'cpu',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-cpuUsage',
        render: (avg: number) => formatMetric('cpu', avg),
        align: 'right',
      },
      {
        name: diskLatencyLabel,
        field: 'diskLatency',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-diskLatency',
        render: (avg: number) => formatMetric('diskLatency', avg),
        align: 'right',
      },
      {
        name: averageRXLabel,
        field: 'rx',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-rx',
        render: (avg: number) => formatMetric('rx', avg),
        align: 'right',
      },
      {
        name: averageTXLabel,
        field: 'tx',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-tx',
        render: (avg: number) => formatMetric('tx', avg),
        align: 'right',
      },
      {
        name: averageTotalMemoryLabel,
        field: 'memoryTotal',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-memoryTotal',
        render: (avg: number) => formatMetric('memoryTotal', avg),
        align: 'right',
      },
      {
        name: averageMemoryUsageLabel,
        field: 'memory',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-memory',
        render: (avg: number) => formatMetric('memory', avg),
        align: 'right',
      },
    ],
    [clickedItemUuid, isFlyoutOpen, reportHostEntryClick, time]
  );

  const onTableChange = useCallback(
    async ({ page, sort }: CriteriaWithPagination<HostNodeRow>) => {
      const { index: pageIndex, size: pageSize } = page;
      const { field } = sort ?? {};

      const pagination = { pageIndex, pageSize };
      // This isn't safe, but when only pagination happens,
      // `field` will contain the column name instead of the column field.
      // That's how here sorting action differentiates from pagination
      const isSorting = sortableFields.has(field ?? '');

      if (isSorting && !isEqual(properties.sorting, sort)) {
        await fetch({
          sortDirection: sort?.direction,
          sortField: sort?.field as any,
        });
        setProperties({
          sorting: sort,
        });
      } else if (!isEqual(properties.pagination, pagination)) {
        setProperties({
          pagination,
        });
      }
    },
    [fetch, properties.pagination, properties.sorting, setProperties, sortableFields]
  );

  return {
    columns,
    items,
    closeFlyout,
    isFlyoutOpen,
    clickedItemUuid,
    onTableChange,
    ...properties,
  };
};
