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
  EuiDataGridProps,
} from '@elastic/eui';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type {
  BrowserFields,
  RuleRegistrySearchRequestPagination,
} from '@kbn/rule-registry-plugin/common';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useFetchAlerts } from './hooks/use_fetch_alerts';
import { AlertsTable } from './alerts_table';
import { BulkActionsContext } from './bulk_actions/context';
import { EmptyState } from './empty_state';
import {
  AlertsTableConfigurationRegistry,
  AlertsTableProps,
  BulkActionsReducerAction,
  BulkActionsState,
  RowSelectionState,
} from '../../../types';
import { ALERTS_TABLE_CONF_ERROR_MESSAGE, ALERTS_TABLE_CONF_ERROR_TITLE } from './translations';
import { TypeRegistry } from '../../type_registry';
import { bulkActionsReducer } from './bulk_actions/reducer';
import { useGetUserCasesPermissions } from './hooks/use_get_user_cases_permissions';
import { useColumns } from './hooks/use_columns';

const DefaultPagination = {
  pageSize: 10,
  pageIndex: 0,
};

interface CaseUi {
  ui: {
    getCasesContext: () => React.FC<any>;
  };
}

export type AlertsTableStateProps = {
  alertsTableConfigurationRegistry: TypeRegistry<AlertsTableConfigurationRegistry>;
  configurationId: string;
  id: string;
  featureIds: ValidFeatureId[];
  flyoutSize?: EuiFlyoutSize;
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  pageSize?: number;
  showExpandToDetails: boolean;
  browserFields?: BrowserFields;
} & Partial<EuiDataGridProps>;

export interface AlertsTableStorage {
  columns: EuiDataGridColumn[];
  visibleColumns?: string[];
  sort: SortCombinations[];
}

const EmptyConfiguration: AlertsTableConfigurationRegistry = {
  id: '',
  casesFeatureId: '',
  columns: [],
  sort: [],
  getRenderCellValue: () => () => null,
};

const AlertsTableWithBulkActionsContextComponent: React.FunctionComponent<{
  tableProps: AlertsTableProps;
  initialBulkActionsState: [BulkActionsState, React.Dispatch<BulkActionsReducerAction>];
}> = ({ tableProps, initialBulkActionsState }) => (
  <BulkActionsContext.Provider value={initialBulkActionsState}>
    <AlertsTable {...tableProps} />
  </BulkActionsContext.Provider>
);

const AlertsTableWithBulkActionsContext = React.memo(AlertsTableWithBulkActionsContextComponent);
const EMPTY_FIELDS = [{ field: '*', include_unmapped: true }];

const AlertsTableState = ({
  alertsTableConfigurationRegistry,
  configurationId,
  id,
  featureIds,
  flyoutSize,
  query,
  pageSize,
  showExpandToDetails,
  leadingControlColumns,
  rowHeightsOptions,
  renderCellValue,
  columns: propColumns,
  gridStyle,
  browserFields: propBrowserFields,
}: AlertsTableStateProps) => {
  const { cases } = useKibana<{ cases: CaseUi }>().services;

  const hasAlertsTableConfiguration =
    alertsTableConfigurationRegistry?.has(configurationId) ?? false;
  const alertsTableConfiguration = hasAlertsTableConfiguration
    ? alertsTableConfigurationRegistry.get(configurationId)
    : EmptyConfiguration;

  const storage = useRef(new Storage(window.localStorage));
  const localAlertsTableConfig = storage.current.get(id) as Partial<AlertsTableStorage>;
  const persistentControls = alertsTableConfiguration?.usePersistentControls?.();

  const columnsLocal =
    localAlertsTableConfig &&
    localAlertsTableConfig.columns &&
    !isEmpty(localAlertsTableConfig?.columns)
      ? localAlertsTableConfig?.columns ?? []
      : propColumns && !isEmpty(propColumns)
      ? propColumns
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

  const {
    columns,
    onColumnsChange,
    browserFields,
    isBrowserFieldDataLoading,
    onToggleColumn,
    onResetColumns,
    visibleColumns,
    onChangeVisibleColumns,
  } = useColumns({
    featureIds,
    storageAlertsTable,
    storage,
    id,
    defaultColumns: columnsLocal ?? [],
  });

  const finalBrowserFields = useMemo(
    () => propBrowserFields ?? browserFields,
    [propBrowserFields, browserFields]
  );

  const [
    isLoading,
    {
      alerts,
      oldAlertsData,
      ecsAlertsData,
      isInitializing,
      getInspectQuery,
      refetch: refresh,
      totalAlerts: alertsCount,
      updatedAt,
    },
  ] = useFetchAlerts({
    fields: EMPTY_FIELDS,
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
    rowSelection: new Map<number, RowSelectionState>(),
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

  const useFetchAlertsData = useCallback(() => {
    return {
      activePage: pagination.pageIndex,
      alerts,
      alertsCount,
      isInitializing,
      isLoading,
      getInspectQuery,
      onPageChange,
      onSortChange,
      refresh,
      sort,
      updatedAt,
      oldAlertsData,
      ecsAlertsData,
    };
  }, [
    alerts,
    alertsCount,
    ecsAlertsData,
    getInspectQuery,
    isInitializing,
    isLoading,
    oldAlertsData,
    onPageChange,
    onSortChange,
    pagination.pageIndex,
    refresh,
    sort,
    updatedAt,
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
      id,
      leadingControlColumns: leadingControlColumns ?? [],
      showExpandToDetails,
      trailingControlColumns: [],
      useFetchAlertsData,
      visibleColumns,
      'data-test-subj': 'internalAlertsState',
      updatedAt,
      browserFields: finalBrowserFields,
      onToggleColumn,
      onResetColumns,
      onColumnsChange,
      onChangeVisibleColumns,
      query,
      rowHeightsOptions,
      renderCellValue,
      gridStyle,
      controls: persistentControls,
    }),
    [
      alertsTableConfiguration,
      columns,
      flyoutSize,
      pagination.pageSize,
      id,
      showExpandToDetails,
      useFetchAlertsData,
      visibleColumns,
      updatedAt,
      finalBrowserFields,
      onToggleColumn,
      onResetColumns,
      onColumnsChange,
      onChangeVisibleColumns,
      leadingControlColumns,
      query,
      rowHeightsOptions,
      renderCellValue,
      gridStyle,
      persistentControls,
    ]
  );

  const CasesContext = cases?.ui.getCasesContext();
  const userCasesPermissions = useGetUserCasesPermissions(alertsTableConfiguration.casesFeatureId);

  return hasAlertsTableConfiguration ? (
    <>
      {!isLoading && alertsCount === 0 && <EmptyState controls={persistentControls} />}
      {(isLoading || isBrowserFieldDataLoading) && (
        <EuiProgress size="xs" color="accent" data-test-subj="internalAlertsPageLoading" />
      )}
      {alertsCount !== 0 && CasesContext && cases && (
        <CasesContext
          owner={[configurationId]}
          permissions={userCasesPermissions}
          features={{ alerts: { sync: false } }}
        >
          <AlertsTableWithBulkActionsContext
            tableProps={tableProps}
            initialBulkActionsState={initialBulkActionsState}
          />
        </CasesContext>
      )}
      {alertsCount !== 0 && (!CasesContext || !cases) && (
        <AlertsTableWithBulkActionsContext
          tableProps={tableProps}
          initialBulkActionsState={initialBulkActionsState}
        />
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
