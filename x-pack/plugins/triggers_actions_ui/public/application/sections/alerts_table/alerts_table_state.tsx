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
  EuiDataGridProps,
  EuiDataGridToolBarVisibilityOptions,
  EuiButton,
  EuiCode,
  EuiCopy,
  EuiDataGridControlColumn,
} from '@elastic/eui';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ALERT_CASE_IDS,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_RULE_UUID,
} from '@kbn/rule-data-utils';
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
import { useGetMutedAlerts } from './hooks/alert_mute/use_get_muted_alerts';
import { useFetchAlerts } from './hooks/use_fetch_alerts';
import { AlertsTable } from './alerts_table';
import { EmptyState } from './empty_state';
import {
  Alert,
  Alerts,
  AlertsTableConfigurationRegistry,
  AlertsTableConfigurationRegistryContract,
  AlertsTableProps,
  RowSelectionState,
  TableUpdateHandlerArgs,
} from '../../../types';
import {
  ALERTS_TABLE_CONF_ERROR_MESSAGE,
  ALERTS_TABLE_CONF_ERROR_TITLE,
  ALERTS_TABLE_UNKNOWN_ERROR_TITLE,
  ALERTS_TABLE_UNKNOWN_ERROR_MESSAGE,
  ALERTS_TABLE_UNKNOWN_ERROR_COPY_TO_CLIPBOARD_LABEL,
} from './translations';
import { bulkActionsReducer } from './bulk_actions/reducer';
import { useColumns } from './hooks/use_columns';
import { InspectButtonContainer } from './toolbar/components/inspect';
import { alertsTableQueryClient } from './query_client';
import { useBulkGetCases } from './hooks/use_bulk_get_cases';
import { useBulkGetMaintenanceWindows } from './hooks/use_bulk_get_maintenance_windows';
import { CasesService } from './types';
import { AlertsTableContext, AlertsTableQueryContext } from './contexts/alerts_table_context';
import { ErrorBoundary, FallbackComponent } from '../common/components/error_boundary';

const DefaultPagination = {
  pageSize: 10,
  pageIndex: 0,
};

export type AlertsTableStateProps = {
  alertsTableConfigurationRegistry: AlertsTableConfigurationRegistryContract;
  configurationId: string;
  id: string;
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  pageSize?: number;
  browserFields?: BrowserFields;
  onUpdate?: (args: TableUpdateHandlerArgs) => void;
  onLoaded?: () => void;
  runtimeMappings?: MappingRuntimeFields;
  showAlertStatusWithFlapping?: boolean;
  toolbarVisibility?: EuiDataGridToolBarVisibilityOptions;
  /**
   * Allows to consumers of the table to decide to highlight a row based on the current alert.
   */
  shouldHighlightRow?: (alert: Alert) => boolean;
  /**
   * Enable when rows may have variable heights (disables virtualization)
   */
  dynamicRowHeight?: boolean;
  lastReloadRequestTime?: number;
  renderCellPopover?: AlertsTableProps['renderCellPopover'];
} & Omit<Partial<EuiDataGridProps>, 'renderCellPopover'> &
  (
    | {
        // @deprecated should use ruleTypeIds
        featureIds: ValidFeatureId[];
        ruleTypeIds?: never;
      }
    | {
        featureIds?: never;
        ruleTypeIds: string[];
      }
  );

export interface AlertsTableStorage {
  columns: EuiDataGridColumn[];
  visibleColumns?: string[];
  sort: SortCombinations[];
}

const EmptyConfiguration: AlertsTableConfigurationRegistry = {
  id: '',
  columns: [],
  sort: [],
  getRenderCellValue: () => () => null,
};

type AlertWithCaseIds = Alert & Required<Pick<Alert, typeof ALERT_CASE_IDS>>;
type AlertWithMaintenanceWindowIds = Alert &
  Required<Pick<Alert, typeof ALERT_MAINTENANCE_WINDOW_IDS>>;

const getCaseIdsFromAlerts = (alerts: Alerts): Set<string> =>
  new Set(
    alerts
      .filter((alert): alert is AlertWithCaseIds => {
        const caseIds = alert[ALERT_CASE_IDS];
        return caseIds != null && caseIds.length > 0;
      })
      .map((alert) => alert[ALERT_CASE_IDS])
      .flat()
  );

const getMaintenanceWindowIdsFromAlerts = (alerts: Alerts): Set<string> =>
  new Set(
    alerts
      .filter((alert): alert is AlertWithMaintenanceWindowIds => {
        const maintenanceWindowIds = alert[ALERT_MAINTENANCE_WINDOW_IDS];
        return maintenanceWindowIds != null && maintenanceWindowIds.length > 0;
      })
      .map((alert) => alert[ALERT_MAINTENANCE_WINDOW_IDS])
      .flat()
  );

const isCasesColumnEnabled = (columns: EuiDataGridColumn[]): boolean =>
  columns.some(({ id }) => id === ALERT_CASE_IDS);

const isMaintenanceWindowColumnEnabled = (columns: EuiDataGridColumn[]): boolean =>
  columns.some(({ id }) => id === ALERT_MAINTENANCE_WINDOW_IDS);

const ErrorBoundaryFallback: FallbackComponent = ({ error }) => {
  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={<h2>{ALERTS_TABLE_UNKNOWN_ERROR_TITLE}</h2>}
      body={
        <>
          <p>{ALERTS_TABLE_UNKNOWN_ERROR_MESSAGE}</p>
          {error.message && <EuiCode>{error.message}</EuiCode>}
        </>
      }
      actions={
        <EuiCopy textToCopy={[error.message, error.stack].filter(Boolean).join('\n')}>
          {(copy) => (
            <EuiButton onClick={copy} color="danger" fill>
              {ALERTS_TABLE_UNKNOWN_ERROR_COPY_TO_CLIPBOARD_LABEL}
            </EuiButton>
          )}
        </EuiCopy>
      }
    />
  );
};

const AlertsTableState = (props: AlertsTableStateProps) => {
  return (
    <QueryClientProvider client={alertsTableQueryClient} context={AlertsTableQueryContext}>
      <ErrorBoundary fallback={ErrorBoundaryFallback}>
        <AlertsTableStateWithQueryProvider {...props} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

const DEFAULT_LEADING_CONTROL_COLUMNS: EuiDataGridControlColumn[] = [];

const AlertsTableStateWithQueryProvider = ({
  alertsTableConfigurationRegistry,
  configurationId,
  id,
  featureIds,
  query,
  pageSize,
  leadingControlColumns = DEFAULT_LEADING_CONTROL_COLUMNS,
  rowHeightsOptions,
  renderCellValue,
  renderCellPopover,
  columns: propColumns,
  gridStyle,
  browserFields: propBrowserFields,
  onUpdate,
  onLoaded,
  ruleTypeIds,
  runtimeMappings,
  showAlertStatusWithFlapping,
  toolbarVisibility,
  shouldHighlightRow,
  dynamicRowHeight,
  lastReloadRequestTime,
}: AlertsTableStateProps) => {
  const { cases: casesService } = useKibana<{ cases?: CasesService }>().services;
  const hasAlertsTableConfiguration =
    alertsTableConfigurationRegistry?.has(configurationId) ?? false;

  if (!hasAlertsTableConfiguration)
    // eslint-disable-next-line no-console
    console.warn(`Missing Alert Table configuration for configuration ID: ${configurationId}`);

  const alertsTableConfiguration = hasAlertsTableConfiguration
    ? alertsTableConfigurationRegistry.get(configurationId)
    : EmptyConfiguration;

  const storage = useRef(new Storage(window.localStorage));
  const localStorageAlertsTableConfig = storage.current.get(id) as Partial<AlertsTableStorage>;
  const persistentControls = alertsTableConfiguration?.usePersistentControls?.();
  const showInspectButton = alertsTableConfiguration?.showInspectButton ?? false;

  const columnConfigByClient =
    propColumns && !isEmpty(propColumns) ? propColumns : alertsTableConfiguration?.columns ?? [];

  const columnsLocal =
    localStorageAlertsTableConfig &&
    localStorageAlertsTableConfig.columns &&
    !isEmpty(localStorageAlertsTableConfig?.columns)
      ? localStorageAlertsTableConfig?.columns
      : columnConfigByClient;

  const getStorageConfig = () => ({
    columns: columnsLocal,
    sort:
      localStorageAlertsTableConfig &&
      localStorageAlertsTableConfig.sort &&
      !isEmpty(localStorageAlertsTableConfig?.sort)
        ? localStorageAlertsTableConfig?.sort
        : alertsTableConfiguration?.sort ?? [],
    visibleColumns:
      localStorageAlertsTableConfig &&
      localStorageAlertsTableConfig.visibleColumns &&
      !isEmpty(localStorageAlertsTableConfig?.visibleColumns)
        ? localStorageAlertsTableConfig?.visibleColumns
        : columnsLocal.map((c) => c.id),
  });
  const storageAlertsTable = useRef<AlertsTableStorage>(getStorageConfig());

  storageAlertsTable.current = getStorageConfig();

  const [sort, setSort] = useState<SortCombinations[]>(storageAlertsTable.current.sort);
  const [pagination, setPagination] = useState({
    ...DefaultPagination,
    pageSize: pageSize ?? DefaultPagination.pageSize,
  });

  const columnsProps = {
    storageAlertsTable,
    storage,
    id,
    defaultColumns: columnConfigByClient,
    initialBrowserFields: propBrowserFields,
  };
  const {
    columns,
    browserFields,
    isBrowserFieldDataLoading,
    onToggleColumn,
    onResetColumns,
    visibleColumns,
    onChangeVisibleColumns,
    onColumnResize,
    fields,
  } = useColumns(featureIds ? { ...columnsProps, featureIds } : { ...columnsProps, ruleTypeIds });

  const onPageChange = useCallback((_pagination: RuleRegistrySearchRequestPagination) => {
    setPagination(_pagination);
  }, []);

  const fetchAlertParams = {
    fields,
    query,
    pagination,
    onPageChange,
    onLoaded,
    runtimeMappings,
    sort,
    skip: false,
  };
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
  ] = useFetchAlerts(
    featureIds ? { ...fetchAlertParams, featureIds } : { ...fetchAlertParams, ruleTypeIds }
  );

  const { data: mutedAlerts } = useGetMutedAlerts([
    ...new Set(alerts.map((a) => a[ALERT_RULE_UUID]![0])),
  ]);

  useEffect(() => {
    if (hasAlertsTableConfiguration) {
      alertsTableConfigurationRegistry.update(configurationId, {
        ...alertsTableConfiguration,
        actions: { toggleColumn: onToggleColumn },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onToggleColumn]);

  useEffect(() => {
    if (onUpdate) {
      onUpdate({ isLoading, totalCount: alertsCount, refresh });
    }
  }, [isLoading, alertsCount, onUpdate, refresh]);
  useEffect(() => {
    if (lastReloadRequestTime) {
      refresh();
    }
  }, [lastReloadRequestTime, refresh]);

  const caseIds = useMemo(() => getCaseIdsFromAlerts(alerts), [alerts]);
  const maintenanceWindowIds = useMemo(() => getMaintenanceWindowIdsFromAlerts(alerts), [alerts]);

  const casesPermissions = casesService?.helpers.canUseCases(
    alertsTableConfiguration?.cases?.owner ?? []
  );

  const hasCaseReadPermissions = Boolean(casesPermissions?.read);
  const fetchCases = isCasesColumnEnabled(columns) && hasCaseReadPermissions;
  const fetchMaintenanceWindows = isMaintenanceWindowColumnEnabled(columns);

  const { data: cases, isFetching: isLoadingCases } = useBulkGetCases(
    Array.from(caseIds.values()),
    fetchCases
  );

  const { data: maintenanceWindows, isFetching: isLoadingMaintenanceWindows } =
    useBulkGetMaintenanceWindows({
      ids: Array.from(maintenanceWindowIds.values()),
      canFetchMaintenanceWindows: fetchMaintenanceWindows,
      queryContext: AlertsTableQueryContext,
    });

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
    pagination,
    refresh,
    sort,
    updatedAt,
  ]);

  const CasesContext = casesService?.ui.getCasesContext();
  const isCasesContextAvailable = casesService && CasesContext;

  const memoizedCases = useMemo(
    () => ({
      data: cases ?? new Map(),
      isLoading: isLoadingCases,
    }),
    [cases, isLoadingCases]
  );

  const memoizedMaintenanceWindows = useMemo(
    () => ({
      data: maintenanceWindows ?? new Map(),
      isLoading: isLoadingMaintenanceWindows,
    }),
    [maintenanceWindows, isLoadingMaintenanceWindows]
  );

  const tableProps: AlertsTableProps = useMemo(
    () => ({
      alertsTableConfiguration,
      cases: memoizedCases,
      maintenanceWindows: memoizedMaintenanceWindows,
      columns,
      bulkActions: [],
      deletedEventIds: [],
      disabledCellActions: [],
      pageSize: pagination.pageSize,
      pageSizeOptions: [10, 20, 50, 100],
      id,
      leadingControlColumns,
      showAlertStatusWithFlapping,
      trailingControlColumns: [],
      useFetchAlertsData,
      visibleColumns,
      'data-test-subj': 'internalAlertsState',
      updatedAt,
      browserFields,
      onToggleColumn,
      onResetColumns,
      onChangeVisibleColumns,
      onColumnResize,
      query,
      rowHeightsOptions,
      renderCellValue,
      renderCellPopover,
      gridStyle,
      controls: persistentControls,
      showInspectButton,
      toolbarVisibility,
      shouldHighlightRow,
      dynamicRowHeight,
      featureIds,
    }),
    [
      alertsTableConfiguration,
      memoizedCases,
      memoizedMaintenanceWindows,
      columns,
      pagination.pageSize,
      id,
      leadingControlColumns,
      showAlertStatusWithFlapping,
      useFetchAlertsData,
      visibleColumns,
      updatedAt,
      browserFields,
      onToggleColumn,
      onResetColumns,
      onChangeVisibleColumns,
      onColumnResize,
      query,
      rowHeightsOptions,
      renderCellValue,
      renderCellPopover,
      gridStyle,
      persistentControls,
      showInspectButton,
      toolbarVisibility,
      shouldHighlightRow,
      dynamicRowHeight,
      featureIds,
    ]
  );

  if (!hasAlertsTableConfiguration) {
    return (
      <EuiEmptyPrompt
        data-test-subj="alertsTableNoConfiguration"
        iconType="watchesApp"
        title={<h2>{ALERTS_TABLE_CONF_ERROR_TITLE}</h2>}
        body={<p>{ALERTS_TABLE_CONF_ERROR_MESSAGE}</p>}
      />
    );
  }

  return (
    <AlertsTableContext.Provider
      value={{
        mutedAlerts: mutedAlerts ?? {},
        bulkActions: initialBulkActionsState,
      }}
    >
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
      {alertsCount !== 0 && isCasesContextAvailable && (
        <CasesContext
          owner={alertsTableConfiguration.cases?.owner ?? []}
          permissions={casesPermissions}
          features={{ alerts: { sync: alertsTableConfiguration.cases?.syncAlerts ?? false } }}
        >
          <AlertsTable {...tableProps} />
        </CasesContext>
      )}
      {alertsCount !== 0 && !isCasesContextAvailable && <AlertsTable {...tableProps} />}
    </AlertsTableContext.Provider>
  );
};

export { AlertsTableState };
// eslint-disable-next-line import/no-default-export
export { AlertsTableState as default };
