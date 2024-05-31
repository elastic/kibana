/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBasicTableColumn, CriteriaWithPagination, EuiTableSelectionType } from '@elastic/eui';
import createContainer from 'constate';
import useAsync from 'react-use/lib/useAsync';
import { isEqual } from 'lodash';
import { isNumber } from 'lodash/fp';
import { CloudProvider } from '@kbn/custom-icons';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { EuiToolTip } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { createInventoryMetricFormatter } from '../../inventory_view/lib/create_inventory_metric_formatter';
import { EntryTitle } from '../components/table/entry_title';
import type {
  InfraAssetMetadataType,
  InfraAssetMetricsItem,
  InfraAssetMetricType,
} from '../../../../../common/http_api';
import { Sorting, useHostsTableUrlState } from './use_hosts_table_url_state';
import { useHostsViewContext } from './use_hosts_view';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import { ColumnHeader } from '../components/table/column_header';
import { TABLE_COLUMN_LABEL, TABLE_CONTENT_LABEL } from '../translations';
import { METRICS_TOOLTIP } from '../../../../common/visualizations';
import { buildCombinedAssetFilter } from '../../../../utils/filters/build';

/**
 * Columns and items types
 */
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
    alertsCount?: number;
  };

/**
 * Helper functions
 */
const formatMetric = (type: InfraAssetMetricType, value: number | undefined | null) => {
  return value || value === 0 ? createInventoryMetricFormatter({ type })(value) : 'N/A';
};

const buildItemsList = (nodes: InfraAssetMetricsItem[]): HostNodeRow[] => {
  return nodes.map(({ metrics, metadata, name, alertsCount }) => {
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

      alertsCount: alertsCount ?? 0,
    };
  });
};

const isTitleColumn = (cell: HostNodeRow[keyof HostNodeRow]): cell is HostNodeRow['title'] => {
  return cell !== null && typeof cell === 'object' && cell && 'name' in cell;
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
 * Build a table columns and items starting from the snapshot nodes.
 */
export const useHostsTable = () => {
  const inventoryModel = findInventoryModel('host');
  const [selectedItems, setSelectedItems] = useState<HostNodeRow[]>([]);
  const { hostNodes } = useHostsViewContext();

  const displayAlerts = hostNodes.some((item) => 'alertsCount' in item);

  const { value: formulas } = useAsync(() => inventoryModel.metrics.getFormulas());

  const [{ detailsItemId, pagination, sorting }, setProperties] = useHostsTableUrlState();
  const {
    services: {
      telemetry,
      data: {
        query: { filterManager: filterManagerService },
      },
    },
  } = useKibanaContextForPlugin();
  const { metricsView } = useMetricsDataViewContext();

  const closeFlyout = useCallback(() => setProperties({ detailsItemId: null }), [setProperties]);

  const onSelectionChange = (newSelectedItems: HostNodeRow[]) => {
    setSelectedItems(newSelectedItems);
  };

  const filterSelectedHosts = useCallback(() => {
    if (!selectedItems.length) {
      return [];
    }
    const selectedHostNames = selectedItems.map(({ name }) => name);
    const newFilter = buildCombinedAssetFilter({
      field: HOST_NAME_FIELD,
      values: selectedHostNames,
      dataView: metricsView?.dataViewReference,
    });

    filterManagerService.addFilters(newFilter);
    setSelectedItems([]);
  }, [filterManagerService, metricsView?.dataViewReference, selectedItems]);

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
    () => items.find(({ id }) => id === detailsItemId),
    [detailsItemId, items]
  );

  const currentPage = useMemo(() => {
    const { pageSize = 0, pageIndex = 0 } = pagination;

    const endIndex = (pageIndex + 1) * pageSize;
    const startIndex = pageIndex * pageSize;

    return items.sort(sortTableData(sorting)).slice(startIndex, endIndex);
  }, [items, pagination, sorting]);

  const metricColumnsWidth = displayAlerts ? '12%' : '16%';

  const columns: Array<EuiBasicTableColumn<HostNodeRow>> = useMemo(
    () => [
      {
        name: '',
        width: '40px',
        field: 'id',
        actions: [
          {
            name: TABLE_COLUMN_LABEL.toggleDialogAction,
            description: TABLE_COLUMN_LABEL.toggleDialogAction,
            icon: ({ id }) => (id === detailsItemId ? 'minimize' : 'expand'),
            type: 'icon',
            'data-test-subj': 'hostsView-flyout-button',
            onClick: ({ id }) => {
              setProperties({
                detailsItemId: id === detailsItemId ? null : id,
              });
            },
          },
        ],
      },
      ...(displayAlerts
        ? [
            {
              name: (
                <ColumnHeader
                  label={TABLE_COLUMN_LABEL.alertsCount}
                  toolTip={METRICS_TOOLTIP.alertsCount}
                  showDocumentationLink={false}
                />
              ),
              width: '95px',
              field: 'alertsCount',
              sortable: true,
              'data-test-subj': 'hostsView-tableRow-alertsCount',
              render: (alertsCount: HostNodeRow['alertsCount'], row: HostNodeRow) => {
                if (!alertsCount) {
                  return null;
                }
                return (
                  <EuiToolTip position="top" content={TABLE_CONTENT_LABEL.activeAlerts}>
                    <EuiBadge
                      iconType="warning"
                      color="danger"
                      onClick={() => {
                        setProperties({ detailsItemId: row.id === detailsItemId ? null : row.id });
                      }}
                      onClickAriaLabel={TABLE_CONTENT_LABEL.activeAlerts}
                      iconOnClick={() => {
                        setProperties({ detailsItemId: row.id === detailsItemId ? null : row.id });
                      }}
                      iconOnClickAriaLabel={TABLE_CONTENT_LABEL.activeAlerts}
                    >
                      {alertsCount}
                    </EuiBadge>
                  </EuiToolTip>
                );
              },
            },
          ]
        : []),
      {
        name: TABLE_COLUMN_LABEL.title,
        field: 'title',
        sortable: true,
        truncateText: true,
        'data-test-subj': 'hostsView-tableRow-title',
        render: (title: HostNodeRow['title']) => (
          <EntryTitle title={title} onClick={() => reportHostEntryClick(title)} />
        ),
        width: displayAlerts ? '15%' : '20%',
      },
      {
        name: (
          <ColumnHeader
            label={TABLE_COLUMN_LABEL.cpuUsage}
            toolTip={METRICS_TOOLTIP.cpuUsage}
            formula={formulas?.cpuUsage.value}
          />
        ),
        width: metricColumnsWidth,
        field: 'cpu',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-cpuUsage',
        render: (avg: number) => formatMetric('cpu', avg),
        align: 'right',
      },
      {
        name: (
          <ColumnHeader
            label={TABLE_COLUMN_LABEL.normalizedLoad1m}
            toolTip={METRICS_TOOLTIP.normalizedLoad1m}
            formula={formulas?.normalizedLoad1m.value}
          />
        ),
        width: metricColumnsWidth,
        field: 'normalizedLoad1m',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-normalizedLoad1m',
        render: (avg: number) => formatMetric('normalizedLoad1m', avg),
        align: 'right',
      },
      {
        name: (
          <ColumnHeader
            label={TABLE_COLUMN_LABEL.memoryUsage}
            toolTip={METRICS_TOOLTIP.memoryUsage}
            formula={formulas?.memoryUsage.value}
          />
        ),
        width: metricColumnsWidth,
        field: 'memory',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-memoryUsage',
        render: (avg: number) => formatMetric('memory', avg),
        align: 'right',
      },
      {
        name: (
          <ColumnHeader
            label={TABLE_COLUMN_LABEL.memoryFree}
            toolTip={METRICS_TOOLTIP.memoryFree}
            formula={formulas?.memoryFree.value}
          />
        ),
        width: metricColumnsWidth,
        field: 'memoryFree',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-memoryFree',
        render: (avg: number) => formatMetric('memoryFree', avg),
        align: 'right',
      },
      {
        name: (
          <ColumnHeader
            label={TABLE_COLUMN_LABEL.diskSpaceUsage}
            toolTip={METRICS_TOOLTIP.diskUsage}
            formula={formulas?.diskUsage.value}
          />
        ),
        width: metricColumnsWidth,
        field: 'diskSpaceUsage',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-diskSpaceUsage',
        render: (max: number) => formatMetric('diskSpaceUsage', max),
        align: 'right',
      },
      {
        name: (
          <ColumnHeader
            label={TABLE_COLUMN_LABEL.rx}
            toolTip={METRICS_TOOLTIP.rx}
            formula={formulas?.rx.value}
          />
        ),
        width: '12%',
        field: 'rx',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-rx',
        render: (avg: number) => formatMetric('rx', avg),
        align: 'right',
      },
      {
        name: (
          <ColumnHeader
            label={TABLE_COLUMN_LABEL.tx}
            toolTip={METRICS_TOOLTIP.tx}
            formula={formulas?.tx.value}
          />
        ),
        width: '12%',
        field: 'tx',
        sortable: true,
        'data-test-subj': 'hostsView-tableRow-tx',
        render: (avg: number) => formatMetric('tx', avg),
        align: 'right',
      },
    ],
    [
      detailsItemId,
      formulas?.cpuUsage.value,
      formulas?.diskUsage.value,
      formulas?.memoryFree.value,
      formulas?.memoryUsage.value,
      formulas?.normalizedLoad1m.value,
      formulas?.rx.value,
      formulas?.tx.value,
      reportHostEntryClick,
      setProperties,
      displayAlerts,
      metricColumnsWidth,
    ]
  );

  const selection: EuiTableSelectionType<HostNodeRow> = {
    onSelectionChange,
    selectable: (item: HostNodeRow) => !!item.name,
    selected: selectedItems,
  };

  return {
    columns,
    clickedItem,
    currentPage,
    closeFlyout,
    items,
    isFlyoutOpen: detailsItemId !== null,
    onTableChange,
    pagination,
    sorting,
    selection,
    selectedItemsCount: selectedItems.length,
    filterSelectedHosts,
  };
};

export const HostsTable = createContainer(useHostsTable);
export const [HostsTableProvider, useHostsTableContext] = HostsTable;
