/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useRef, useMemo, useReducer } from 'react';
import { isEmpty } from 'lodash';
import {
  EuiDataGridColumn,
  EuiProgress,
  EuiDataGridSorting,
  EuiEmptyPrompt,
  EuiFlyoutSize,
} from '@elastic/eui';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { RuleRegistrySearchRequestPagination } from '@kbn/rule-registry-plugin/common';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type {
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useFetchAlerts } from './hooks/use_fetch_alerts';
import { AlertsTable } from './alerts_table';
import { BulkActionsContext } from './bulk_actions/context';
import { EmptyState } from './empty_state';
import { AlertsTableConfigurationRegistry } from '../../../types';
import { ALERTS_TABLE_CONF_ERROR_MESSAGE, ALERTS_TABLE_CONF_ERROR_TITLE } from './translations';
import { TypeRegistry } from '../../type_registry';
import { bulkActionsReducer } from './bulk_actions/reducer';

const DefaultPagination = {
  pageSize: 10,
  pageIndex: 0,
};

export interface AlertsTableStateProps {
  alertsTableConfigurationRegistry: TypeRegistry<AlertsTableConfigurationRegistry>;
  configurationId: string;
  id: string;
  featureIds: ValidFeatureId[];
  flyoutSize?: EuiFlyoutSize;
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  pageSize?: number;
  showExpandToDetails: boolean;
}

interface AlertsTableStorage {
  columns: EuiDataGridColumn[];
  visibleColumns?: string[];
  sort: SortCombinations[];
}

const EmptyConfiguration = {
  id: '',
  columns: [],
  sort: [],
  externalFlyout: {
    header: () => null,
    body: () => null,
    footer: () => null,
  },
  internalFlyout: {
    header: () => null,
    body: () => null,
    footer: () => null,
  },
  getRenderCellValue: () => () => null,
};

const AlertsTableState = ({
  alertsTableConfigurationRegistry,
  configurationId,
  id,
  featureIds,
  flyoutSize,
  query,
  pageSize,
  showExpandToDetails,
}: AlertsTableStateProps) => {
  const hasAlertsTableConfiguration =
    alertsTableConfigurationRegistry?.has(configurationId) ?? false;
  const alertsTableConfiguration = hasAlertsTableConfiguration
    ? alertsTableConfigurationRegistry.get(configurationId)
    : EmptyConfiguration;

  const storage = useRef(new Storage(window.localStorage));
  const localAlertsTableConfig = storage.current.get(id) as Partial<AlertsTableStorage>;

  const columnsLocal =
    localAlertsTableConfig &&
    localAlertsTableConfig.columns &&
    !isEmpty(localAlertsTableConfig?.columns)
      ? localAlertsTableConfig?.columns ?? []
      : alertsTableConfiguration?.columns ?? [];

  const storageAlertsTable = useRef<AlertsTableStorage>({
    columns: columnsLocal,
    sort:
      localAlertsTableConfig &&
      localAlertsTableConfig.sort &&
      !isEmpty(localAlertsTableConfig?.sort)
        ? localAlertsTableConfig?.sort ?? []
        : alertsTableConfiguration?.sort ?? [],
    visibleColumns:
      localAlertsTableConfig &&
      localAlertsTableConfig.visibleColumns &&
      !isEmpty(localAlertsTableConfig?.visibleColumns)
        ? localAlertsTableConfig?.visibleColumns ?? []
        : columnsLocal.map((c) => c.id),
  });

  const [sort, setSort] = useState<SortCombinations[]>(storageAlertsTable.current.sort);
  const [pagination, setPagination] = useState({
    ...DefaultPagination,
    pageSize: pageSize ?? DefaultPagination.pageSize,
  });
  const [columns, setColumns] = useState<EuiDataGridColumn[]>(storageAlertsTable.current.columns);

  const [
    isLoading,
    { alerts, isInitializing, getInspectQuery, refetch: refresh, totalAlerts: alertsCount },
  ] = useFetchAlerts({
    fields: columns.map((col) => ({ field: col.id, include_unmapped: true })),
    featureIds,
    query,
    pagination,
    sort,
    skip: false,
  });

  const onPageChange = useCallback((_pagination: RuleRegistrySearchRequestPagination) => {
    setPagination(_pagination);
  }, []);

  const initialBulkActionsState = useReducer(bulkActionsReducer, {
    rowSelection: new Set<number>(),
    isAllSelected: false,
    areAllVisibleRowsSelected: false,
    rowCount: alerts.length,
  });

  const onSortChange = useCallback(
    (_sort: EuiDataGridSorting['columns']) => {
      const newSort = _sort.map((sortItem) => {
        return {
          [sortItem.id]: {
            order: sortItem.direction,
          },
        };
      });

      storageAlertsTable.current = {
        ...storageAlertsTable.current,
        sort: newSort,
      };
      storage.current.set(id, storageAlertsTable.current);
      setSort(newSort);
    },
    [id]
  );
  const onColumnsChange = useCallback(
    (newColumns: EuiDataGridColumn[], visibleColumns: string[]) => {
      setColumns(newColumns);
      storageAlertsTable.current = {
        ...storageAlertsTable.current,
        columns: newColumns,
        visibleColumns,
      };
      storage.current.set(id, storageAlertsTable.current);
    },
    [id, storage]
  );

  const useFetchAlertsData = useCallback(() => {
    return {
      activePage: pagination.pageIndex,
      alerts,
      alertsCount,
      isInitializing,
      isLoading,
      getInspectQuery,
      onColumnsChange,
      onPageChange,
      onSortChange,
      refresh,
      sort,
    };
  }, [
    alerts,
    alertsCount,
    getInspectQuery,
    isInitializing,
    isLoading,
    onColumnsChange,
    onPageChange,
    onSortChange,
    pagination.pageIndex,
    refresh,
    sort,
  ]);

  const tableProps = useMemo(
    () => ({
      alertsTableConfiguration,
      columns,
      bulkActions: [],
      deletedEventIds: [],
      disabledCellActions: [],
      flyoutSize,
      pageSize: pagination.pageSize,
      pageSizeOptions: [10, 20, 50, 100],
      leadingControlColumns: [],
      showExpandToDetails,
      trailingControlColumns: [],
      useFetchAlertsData,
      visibleColumns: storageAlertsTable.current.visibleColumns ?? [],
      'data-test-subj': 'internalAlertsState',
      query,
    }),
    [
      alertsTableConfiguration,
      columns,
      flyoutSize,
      pagination.pageSize,
      showExpandToDetails,
      useFetchAlertsData,
      query,
    ]
  );

  return hasAlertsTableConfiguration ? (
    <>
      {!isLoading && alertsCount === 0 && <EmptyState />}
      {isLoading && (
        <EuiProgress size="xs" color="accent" data-test-subj="internalAlertsPageLoading" />
      )}
      {alertsCount !== 0 && (
        <BulkActionsContext.Provider value={initialBulkActionsState}>
          <AlertsTable {...tableProps} />
        </BulkActionsContext.Provider>
      )}
    </>
  ) : (
    <EuiEmptyPrompt
      data-test-subj="alertsTableNoConfiguration"
      iconType="watchesApp"
      title={<h2>{ALERTS_TABLE_CONF_ERROR_TITLE}</h2>}
      body={<p>{ALERTS_TABLE_CONF_ERROR_MESSAGE}</p>}
    />
  );
};

export { AlertsTableState };
// eslint-disable-next-line import/no-default-export
export { AlertsTableState as default };
