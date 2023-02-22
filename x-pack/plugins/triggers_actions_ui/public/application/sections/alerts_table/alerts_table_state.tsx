/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef, useMemo, useReducer, useEffect } from 'react';
import { isEmpty } from 'lodash';
import {
  EuiDataGridColumn,
  EuiProgress,
  EuiDataGridSorting,
  EuiEmptyPrompt,
  EuiFlyoutSize,
  EuiDataGridProps,
  EuiDataGridToolBarVisibilityOptions,
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
import { QueryClientProvider } from '@tanstack/react-query';
import { useFetchAlerts } from './hooks/use_fetch_alerts';
import { AlertsTable } from './alerts_table';
import { BulkActionsContext } from './bulk_actions/context';
import { EmptyState } from './empty_state';
import {
  Alert,
  Alerts,
  AlertsTableConfigurationRegistry,
  AlertsTableProps,
  BulkActionsReducerAction,
  BulkActionsState,
  RowSelectionState,
  TableUpdateHandlerArgs,
} from '../../../types';
import { ALERTS_TABLE_CONF_ERROR_MESSAGE, ALERTS_TABLE_CONF_ERROR_TITLE } from './translations';
import { TypeRegistry } from '../../type_registry';
import { bulkActionsReducer } from './bulk_actions/reducer';
import { useGetUserCasesPermissions } from './hooks/use_get_user_cases_permissions';
import { useColumns } from './hooks/use_columns';
import { InspectButtonContainer } from './toolbar/components/inspect';
import { alertsTableQueryClient } from './query_client';
import { useBulkGetCases } from './hooks/use_bulk_get_cases';

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
  onUpdate?: (args: TableUpdateHandlerArgs) => void;
  showAlertStatusWithFlapping?: boolean;
  toolbarVisibility?: EuiDataGridToolBarVisibilityOptions;
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

type AlertWithCaseIds = Alert & Required<Pick<Alert, 'kibana.alert.case_ids'>>;

const getCaseIdsFromAlerts = (alerts: Alerts): Set<string> =>
  new Set(
    alerts
      .filter(
        (alert): alert is AlertWithCaseIds =>
          alert['kibana.alert.case_ids'] != null && alert['kibana.alert.case_ids'].length > 0
      )
      .map((alert) => alert['kibana.alert.case_ids'])
      .flat()
  );

const AlertsTableState = (props: AlertsTableStateProps) => {
  return (
    <QueryClientProvider client={alertsTableQueryClient}>
      <AlertsTableStateWithQueryProvider {...props} />
    </QueryClientProvider>
  );
};

const AlertsTableStateWithQueryProvider = ({
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
  onUpdate,
  showAlertStatusWithFlapping,
  toolbarVisibility,
}: AlertsTableStateProps) => {
  const { cases: casesService } = useKibana<{ cases: CaseUi }>().services;

  const hasAlertsTableConfiguration =
    alertsTableConfigurationRegistry?.has(configurationId) ?? false;

  if (!hasAlertsTableConfiguration)
    // eslint-disable-next-line no-console
    console.warn(`Missing Alert Table configuration for configuration ID: ${configurationId}`);

  const alertsTableConfiguration = hasAlertsTableConfiguration
    ? alertsTableConfigurationRegistry.get(configurationId)
    : EmptyConfiguration;

  const storage = useRef(new Storage(window.localStorage));
  const localAlertsTableConfig = storage.current.get(id) as Partial<AlertsTableStorage>;
  const persistentControls = alertsTableConfiguration?.usePersistentControls?.();
  const showInspectButton = alertsTableConfiguration?.showInspectButton ?? false;

  const columnConfigByClient =
    propColumns && !isEmpty(propColumns) ? propColumns : alertsTableConfiguration?.columns ?? [];

  const columnsLocal =
    localAlertsTableConfig &&
    localAlertsTableConfig.columns &&
    !isEmpty(localAlertsTableConfig?.columns)
      ? localAlertsTableConfig?.columns ?? []
      : columnConfigByClient;

  const getStorageConfig = () => ({
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
  const storageAlertsTable = useRef<AlertsTableStorage>(getStorageConfig());

  storageAlertsTable.current = getStorageConfig();

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
    fields,
  } = useColumns({
    featureIds,
    storageAlertsTable,
    storage,
    id,
    defaultColumns: columnConfigByClient,
    initialBrowserFields: propBrowserFields,
  });

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
    fields,
    featureIds,
    query,
    pagination,
    sort,
    skip: false,
  });

  useEffect(() => {
    if (onUpdate) {
      onUpdate({ isLoading, totalCount: alertsCount, refresh });
    }
  }, [isLoading, alertsCount, onUpdate, refresh]);

  const caseIds = useMemo(() => getCaseIdsFromAlerts(alerts), [alerts]);

  const { data: cases, isLoading: isLoadingCases } = useBulkGetCases(Array.from(caseIds.values()));

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

  const tableProps: AlertsTableProps = useMemo(
    () => ({
      alertsTableConfiguration,
      casesData: { cases: cases ?? new Map(), isLoading: isLoadingCases },
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
      showAlertStatusWithFlapping,
      trailingControlColumns: [],
      useFetchAlertsData,
      visibleColumns,
      'data-test-subj': 'internalAlertsState',
      updatedAt,
      browserFields,
      onToggleColumn,
      onResetColumns,
      onColumnsChange,
      onChangeVisibleColumns,
      query,
      rowHeightsOptions,
      renderCellValue,
      gridStyle,
      controls: persistentControls,
      showInspectButton,
      toolbarVisibility,
    }),
    [
      alertsTableConfiguration,
      cases,
      isLoadingCases,
      columns,
      flyoutSize,
      pagination.pageSize,
      id,
      showExpandToDetails,
      showAlertStatusWithFlapping,
      useFetchAlertsData,
      visibleColumns,
      updatedAt,
      browserFields,
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
      showInspectButton,
      toolbarVisibility,
    ]
  );

  const CasesContext = casesService?.ui.getCasesContext();
  const userCasesPermissions = useGetUserCasesPermissions(alertsTableConfiguration.casesFeatureId);

  return hasAlertsTableConfiguration ? (
    <>
      {!isLoading && alertsCount === 0 && (
        <InspectButtonContainer>
          <EmptyState
            controls={persistentControls}
            getInspectQuery={getInspectQuery}
            showInpectButton={showInspectButton}
          />
        </InspectButtonContainer>
      )}
      {(isLoading || isBrowserFieldDataLoading) && (
        <EuiProgress size="xs" color="accent" data-test-subj="internalAlertsPageLoading" />
      )}
      {alertsCount !== 0 && CasesContext && casesService && (
        <CasesContext
          owner={[alertsTableConfiguration.app_id ?? configurationId]}
          permissions={userCasesPermissions}
          features={{ alerts: { sync: false } }}
        >
          <AlertsTableWithBulkActionsContext
            tableProps={tableProps}
            initialBulkActionsState={initialBulkActionsState}
          />
        </CasesContext>
      )}
      {alertsCount !== 0 && (!CasesContext || !casesService) && (
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
