/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import createContainer from 'constate';
import { isEqual } from 'lodash';
import { CriteriaWithPagination } from '@elastic/eui';
import { isNumber } from 'lodash/fp';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { createInventoryMetricFormatter } from '../../inventory_view/lib/create_inventory_metric_formatter';
import { HostsTableEntryTitle } from '../components/hosts_table_entry_title';
import {
  InfraAssetMetadataType,
  InfraAssetMetricsItem,
  InfraAssetMetricType,
} from '../../../../../common/http_api';
import { useHostFlyoutUrlState } from './use_host_flyout_url_state';
import { Sorting, useHostsTableUrlState } from './use_hosts_table_url_state';
import { useHostsViewContext } from './use_hosts_view';
import { useUnifiedSearchContext } from './use_unified_search';

/**
 * Columns and items types
 */
export type CloudProvider = 'gcp' | 'aws' | 'azure' | 'unknownProvider';
type HostMetrics = Record<InfraAssetMetricType, number | null>;

interface HostMetadata {
  os?: string | null;
  ip?: string | null;
  servicesOnHost?: number | null;
  title: { name: string; cloudProvider?: CloudProvider | null };
  id: string;
}
export type HostNodeRow = HostMetadata &
  HostMetrics & {
    name: string;
  };

/**
 * Helper functions
 */
const formatMetric = (type: InfraAssetMetricType, value: number | undefined | null) => {
  return value || value === 0 ? createInventoryMetricFormatter({ type })(value) : 'N/A';
};

const buildItemsList = (nodes: InfraAssetMetricsItem[]): HostNodeRow[] => {
  return nodes.map(({ metrics, metadata, name }) => {
    const metadataKeyValue = metadata.reduce(
      (acc, curr) => ({
        ...acc,
        [curr.name]: curr.value,
      }),
      {} as Record<InfraAssetMetadataType, string | null>
    );

    return {
      name,
      id: `${name}-${metadataKeyValue['host.os.name'] ?? '-'}`,
      title: {
        name,
        cloudProvider: (metadataKeyValue['cloud.provider'] as CloudProvider) ?? null,
      },
      os: metadataKeyValue['host.os.name'] ?? '-',
      ip: metadataKeyValue['host.ip'] ?? '',
      ...metrics.reduce(
        (acc, curr) => ({
          ...acc,
          [curr.name]: curr.value ?? 0,
        }),
        {} as HostMetrics
      ),
    };
  });
};

const isTitleColumn = (cell: any): cell is HostNodeRow['title'] => {
  return typeof cell === 'object' && cell && 'name' in cell;
};

const sortValues = (aValue: any, bValue: any, { direction }: Sorting) => {
  if (typeof aValue === 'string' && typeof bValue === 'string') {
    return direction === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
  }

  if (isNumber(aValue) && isNumber(bValue)) {
    return direction === 'desc' ? bValue - aValue : aValue - bValue;
  }

  return 1;
};

const sortTableData =
  ({ direction, field }: Sorting) =>
  (a: HostNodeRow, b: HostNodeRow) => {
    const aValue = a[field as keyof HostNodeRow];
    const bValue = b[field as keyof HostNodeRow];

    if (isTitleColumn(aValue) && isTitleColumn(bValue)) {
      return sortValues(aValue.name, bValue.name, { direction, field });
    }

    return sortValues(aValue, bValue, { direction, field });
  };

/**
 * Columns translations
 */
const titleLabel = i18n.translate('xpack.infra.hostsViewPage.table.nameColumnHeader', {
  defaultMessage: 'Name',
});

const cpuUsageLabel = i18n.translate('xpack.infra.hostsViewPage.table.cpuUsageColumnHeader', {
  defaultMessage: 'CPU usage (avg.)',
});

const diskSpaceUsageLabel = i18n.translate(
  'xpack.infra.hostsViewPage.table.diskSpaceUsageColumnHeader',
  {
    defaultMessage: 'Disk Space Usage (avg.)',
  }
);

const txLabel = i18n.translate('xpack.infra.hostsViewPage.table.txColumnHeader', {
  defaultMessage: 'TX (avg.)',
});

const rxLabel = i18n.translate('xpack.infra.hostsViewPage.table.rxColumnHeader', {
  defaultMessage: 'RX (avg.)',
});

const memoryFreeLabel = i18n.translate('xpack.infra.hostsViewPage.table.memoryFreeColumnHeader', {
  defaultMessage: 'Memory Free (avg.)',
});

const memoryUsageLabel = i18n.translate('xpack.infra.hostsViewPage.table.memoryUsageColumnHeader', {
  defaultMessage: 'Memory Usage (avg.)',
});

const normalizedLoad1mLabel = i18n.translate(
  'xpack.infra.hostsViewPage.table.normalizedLoad1mColumnHeader',
  {
    defaultMessage: 'Normalized Load (avg.)',
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
export const useHostsTable = () => {
  const { hostNodes } = useHostsViewContext();
  const { searchCriteria } = useUnifiedSearchContext();
  const [{ pagination, sorting }, setProperties] = useHostsTableUrlState();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  const [hostFlyoutState, setHostFlyoutState] = useHostFlyoutUrlState();

  const closeFlyout = useCallback(() => setHostFlyoutState(null), [setHostFlyoutState]);

  const reportHostEntryClick = useCallback(
    ({ name, cloudProvider }: HostNodeRow['title']) => {
      telemetry.reportHostEntryClicked({
        hostname: name,
        cloud_provider: cloudProvider,
      });
    },
    [telemetry]
  );

  const onTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<HostNodeRow>) => {
      const { index: pageIndex, size: pageSize } = page;
      const { field, direction } = sort ?? {};

      const currentSorting = { field: field as keyof HostNodeRow, direction };
      const currentPagination = { pageIndex, pageSize };

      if (!isEqual(sorting, currentSorting)) {
        setProperties({ sorting: currentSorting });
      } else if (!isEqual(pagination, currentPagination)) {
        setProperties({ pagination: currentPagination });
      }
    },
    [setProperties, pagination, sorting]
  );

  const items = useMemo(() => buildItemsList(hostNodes), [hostNodes]);
  const clickedItem = useMemo(
    () => items.find(({ id }) => id === hostFlyoutState?.clickedItemId),
    [hostFlyoutState?.clickedItemId, items]
  );

  const currentPage = useMemo(() => {
    const { pageSize = 0, pageIndex = 0 } = pagination;

    const endIndex = (pageIndex + 1) * pageSize;
    const startIndex = pageIndex * pageSize;

    return items.sort(sortTableData(sorting)).slice(startIndex, endIndex);
  }, [items, pagination, sorting]);

  const columns: Array<EuiBasicTableColumn<HostNodeRow>> = useMemo(
    () => [
      {
        name: '',
        width: '40px',
        field: 'id',
        actions: [
          {
            name: toggleDialogActionLabel,
            description: toggleDialogActionLabel,
            icon: ({ id }) =>
              hostFlyoutState?.clickedItemId && id === hostFlyoutState?.clickedItemId
                ? 'minimize'
                : 'expand',
            type: 'icon',
            'data-test-subj': 'hostsView-flyout-button',
            onClick: ({ id }) => {
              setHostFlyoutState({
                clickedItemId: id,
              });
              if (id === hostFlyoutState?.clickedItemId) {
                setHostFlyoutState(null);
              } else {
                setHostFlyoutState({ clickedItemId: id });
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
        'data-test-subj': 'hostsView-tableRow-title',
        render: (title: HostNodeRow['title']) => (
          <HostsTableEntryTitle
            title={title}
            time={searchCriteria.dateRange}
            onClick={() => reportHostEntryClick(title)}
          />
        ),
        width: '20%',
      },
      {
        name: cpuUsageLabel,
        field: 'cpu',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-cpuUsage',
        render: (avg: number) => formatMetric('cpu', avg),
        align: 'right',
      },
      {
        name: normalizedLoad1mLabel,
        field: 'normalizedLoad1m',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-normalizedLoad1m',
        render: (avg: number) => formatMetric('normalizedLoad1m', avg),
        align: 'right',
      },
      {
        name: memoryUsageLabel,
        field: 'memory',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-memoryTotal',
        render: (avg: number) => formatMetric('memory', avg),
        align: 'right',
      },
      {
        name: memoryFreeLabel,
        field: 'memoryFree',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-memoryFree',
        render: (avg: number) => formatMetric('memoryFree', avg),
        align: 'right',
      },
      {
        name: diskSpaceUsageLabel,
        field: 'diskSpaceUsage',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-diskSpaceUsage',
        render: (avg: number) => formatMetric('diskSpaceUsage', avg),
        align: 'right',
      },
      {
        name: rxLabel,
        field: 'rx',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-rx',
        render: (avg: number) => formatMetric('rx', avg),
        align: 'right',
        width: '120px',
      },
      {
        name: txLabel,
        field: 'tx',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-tx',
        render: (avg: number) => formatMetric('tx', avg),
        align: 'right',
        width: '120px',
      },
    ],
    [
      hostFlyoutState?.clickedItemId,
      reportHostEntryClick,
      searchCriteria.dateRange,
      setHostFlyoutState,
    ]
  );

  return {
    columns,
    clickedItem,
    currentPage,
    closeFlyout,
    items,
    isFlyoutOpen: !!hostFlyoutState?.clickedItemId,
    onTableChange,
    pagination,
    sorting,
  };
};

export const HostsTable = createContainer(useHostsTable);
export const [HostsTableProvider, useHostsTableContext] = HostsTable;
