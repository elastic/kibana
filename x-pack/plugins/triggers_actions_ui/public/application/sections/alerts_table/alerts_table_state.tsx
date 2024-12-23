/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef, useMemo, useReducer, useEffect, memo } from 'react';
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
import { ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import type { RuleRegistrySearchRequestPagination } from '@kbn/rule-registry-plugin/common';
import type { BrowserFields } from '@kbn/alerting-types';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type {
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import { DEFAULT_ALERTS_PAGE_SIZE } from '@kbn/alerts-ui-shared/src/common/constants';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import deepEqual from 'fast-deep-equal';
import { useKibana } from '../../../common/lib/kibana';
import { useGetMutedAlerts } from './hooks/alert_mute/use_get_muted_alerts';
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
import { AlertsTableContext } from './contexts/alerts_table_context';
import { ErrorBoundary, FallbackComponent } from '../common/components/error_boundary';

export type AlertsTableStateProps = {
  alertsTableConfigurationRegistry: AlertsTableConfigurationRegistryContract;
  configurationId: string;
  id: string;
  ruleTypeIds: string[];
  consumers?: string[];
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  initialPageSize?: number;
  browserFields?: BrowserFields;
  onUpdate?: (args: TableUpdateHandlerArgs) => void;
  onLoaded?: (alerts: Alerts) => void;
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
  emptyStateHeight?: 'tall' | 'short';
} & Omit<Partial<EuiDataGridProps>, 'renderCellPopover'>;

export interface AlertsTableStorage {
  columns: EuiDataGridColumn[];
  visibleColumns?: string[];
  sort: SortCombinations[];
}

const EmptyConfiguration: AlertsTableConfigurationRegistry = {
  id: '',
  columns: [],
  sort: [],
  getRenderCellValue: () => null,
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

const stableEmptyArray: string[] = [];
const defaultPageSizeOptions = [10, 20, 50, 100];

const emptyRowSelection = new Map<number, RowSelectionState>();

const initialBulkActionsState = {
  rowSelection: emptyRowSelection,
  isAllSelected: false,
  areAllVisibleRowsSelected: false,
  rowCount: 0,
  updatedAt: Date.now(),
};

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

const AlertsTableState = memo((props: AlertsTableStateProps) => {
  return (
    <QueryClientProvider client={alertsTableQueryClient} context={AlertsQueryContext}>
      <ErrorBoundary fallback={ErrorBoundaryFallback}>
        <AlertsTableStateWithQueryProvider {...props} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
});

AlertsTableState.displayName = 'AlertsTableState';

const DEFAULT_LEADING_CONTROL_COLUMNS: EuiDataGridControlColumn[] = [];

const AlertsTableStateWithQueryProvider = memo(
  ({
    alertsTableConfigurationRegistry,
    configurationId,
    id,
    ruleTypeIds,
    consumers,
    query,
    initialPageSize = DEFAULT_ALERTS_PAGE_SIZE,
    leadingControlColumns = DEFAULT_LEADING_CONTROL_COLUMNS,
    trailingControlColumns,
    rowHeightsOptions,
    cellContext,
    columns: propColumns,
    gridStyle,
    browserFields: propBrowserFields,
    onUpdate,
    onLoaded,
    runtimeMappings,
    showAlertStatusWithFlapping,
    toolbarVisibility,
    shouldHighlightRow,
    dynamicRowHeight,
    lastReloadRequestTime,
    emptyStateHeight,
    height,
  }: AlertsTableStateProps) => {
    const {
      data,
      cases: casesService,
      fieldFormats,
    } = useKibana().services as ReturnType<typeof useKibana>['services'] & {
      cases?: CasesService;
    };
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

    const columnConfigByClient = useMemo(() => {
      return propColumns && !isEmpty(propColumns)
        ? propColumns
        : alertsTableConfiguration?.columns ?? [];
    }, [propColumns, alertsTableConfiguration]);

    const columnsLocal =
      localStorageAlertsTableConfig &&
      localStorageAlertsTableConfig.columns &&
      !isEmpty(localStorageAlertsTableConfig?.columns)
        ? localStorageAlertsTableConfig?.columns
        : columnConfigByClient;

    const getStorageConfig = useCallback(
      () => ({
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
      }),
      [columnsLocal, alertsTableConfiguration?.sort, localStorageAlertsTableConfig]
    );
    const storageAlertsTable = useRef<AlertsTableStorage>(getStorageConfig());

    storageAlertsTable.current = getStorageConfig();

    const [sort, setSort] = useState<SortCombinations[]>(storageAlertsTable.current.sort);

    const onPageChange = useCallback((pagination: RuleRegistrySearchRequestPagination) => {
      setQueryParams((prevQueryParams) => ({
        ...prevQueryParams,
        pageSize: pagination.pageSize,
        pageIndex: pagination.pageIndex,
      }));
    }, []);

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
    } = useColumns({
      ruleTypeIds,
      storageAlertsTable,
      storage,
      id,
      defaultColumns: columnConfigByClient,
      alertsFields: propBrowserFields,
    });

    const [queryParams, setQueryParams] = useState({
      ruleTypeIds,
      consumers,
      fields,
      query,
      sort,
      runtimeMappings,
      pageIndex: 0,
      pageSize: initialPageSize,
    });

    useEffect(() => {
      setQueryParams(({ pageIndex: oldPageIndex, pageSize: oldPageSize, ...prevQueryParams }) => ({
        ruleTypeIds,
        consumers,
        fields,
        query,
        sort,
        runtimeMappings,
        // Go back to the first page if the query changes
        pageIndex: !deepEqual(prevQueryParams, {
          ruleTypeIds,
          consumers,
          fields,
          query,
          sort,
          runtimeMappings,
        })
          ? 0
          : oldPageIndex,
        pageSize: oldPageSize,
      }));
    }, [ruleTypeIds, fields, query, runtimeMappings, sort, consumers]);

    const {
      data: alertsData,
      refetch,
      isSuccess,
      isFetching: isLoading,
    } = useSearchAlertsQuery({
      data,
      ...queryParams,
    });

    const {
      alerts = [],
      oldAlertsData = [],
      ecsAlertsData = [],
      total: alertsCount = -1,
      querySnapshot,
    } = alertsData ?? {};

    const refetchAlerts = useCallback(() => {
      if (queryParams.pageIndex !== 0) {
        // Refetch from the first page
        setQueryParams((prevQueryParams) => ({ ...prevQueryParams, pageIndex: 0 }));
      }
      refetch();
    }, [queryParams.pageIndex, refetch]);

    useEffect(() => {
      if (onLoaded && !isLoading && isSuccess) {
        onLoaded(alerts);
      }
    }, [alerts, isLoading, isSuccess, onLoaded]);

    const mutedRuleIds = useMemo(() => {
      return [...new Set(alerts.map((a) => a['kibana.alert.rule.uuid']![0]))];
    }, [alerts]);

    const { data: mutedAlerts } = useGetMutedAlerts(mutedRuleIds);
    const overriddenActions = useMemo(() => {
      return { toggleColumn: onToggleColumn };
    }, [onToggleColumn]);

    const configWithToggle = useMemo(() => {
      return {
        ...alertsTableConfiguration,
        actions: overriddenActions,
      };
    }, [alertsTableConfiguration, overriddenActions]);

    useEffect(() => {
      const currentToggle =
        alertsTableConfigurationRegistry.getActions(configurationId)?.toggleColumn;
      if (onToggleColumn !== currentToggle) {
        alertsTableConfigurationRegistry.update(configurationId, configWithToggle);
      }
    }, [configurationId, alertsTableConfigurationRegistry, configWithToggle, onToggleColumn]);

    useEffect(() => {
      if (onUpdate) {
        onUpdate({ isLoading, totalCount: alertsCount, refresh: refetch });
      }
    }, [isLoading, alertsCount, onUpdate, refetch]);

    useEffect(() => {
      if (lastReloadRequestTime) {
        refetch();
      }
    }, [lastReloadRequestTime, refetch]);

    const caseIds = useMemo(() => getCaseIdsFromAlerts(alerts), [alerts]);
    const maintenanceWindowIds = useMemo(() => getMaintenanceWindowIdsFromAlerts(alerts), [alerts]);

    const casesPermissions = useMemo(() => {
      return casesService?.helpers.canUseCases(alertsTableConfiguration?.cases?.owner ?? []);
    }, [alertsTableConfiguration, casesService]);

    const hasCaseReadPermissions = Boolean(casesPermissions?.read);
    const fetchCases = isCasesColumnEnabled(columns) && hasCaseReadPermissions;
    const fetchMaintenanceWindows = isMaintenanceWindowColumnEnabled(columns);

    const caseIdsForBulk = useMemo(() => {
      return Array.from(caseIds.values());
    }, [caseIds]);

    const { data: cases, isFetching: isLoadingCases } = useBulkGetCases(caseIdsForBulk, fetchCases);

    const maintenanceWindowIdsForBulk = useMemo(() => {
      return {
        ids: Array.from(maintenanceWindowIds.values()),
        canFetchMaintenanceWindows: fetchMaintenanceWindows,
        queryContext: AlertsQueryContext,
      };
    }, [fetchMaintenanceWindows, maintenanceWindowIds]);

    const { data: maintenanceWindows, isFetching: isLoadingMaintenanceWindows } =
      useBulkGetMaintenanceWindows(maintenanceWindowIdsForBulk);

    const activeBulkActionsReducer = useReducer(bulkActionsReducer, initialBulkActionsState);

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

    const CasesContext = useMemo(() => {
      return casesService?.ui.getCasesContext();
    }, [casesService?.ui]);

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
        bulkActions: stableEmptyArray,
        deletedEventIds: stableEmptyArray,
        disabledCellActions: stableEmptyArray,
        pageSizeOptions: defaultPageSizeOptions,
        id,
        leadingControlColumns,
        showAlertStatusWithFlapping,
        trailingControlColumns,
        visibleColumns,
        'data-test-subj': 'internalAlertsState',
        browserFields,
        onToggleColumn,
        onResetColumns,
        onChangeVisibleColumns,
        onColumnResize,
        query,
        rowHeightsOptions,
        cellContext,
        gridStyle,
        controls: persistentControls,
        showInspectButton,
        toolbarVisibility,
        shouldHighlightRow,
        dynamicRowHeight,
        ruleTypeIds,
        querySnapshot,
        pageIndex: queryParams.pageIndex,
        pageSize: queryParams.pageSize,
        sort,
        isLoading,
        alerts,
        oldAlertsData,
        ecsAlertsData,
        refetchAlerts,
        alertsCount,
        onSortChange,
        onPageChange,
        fieldFormats,
        height,
      }),
      [
        alertsTableConfiguration,
        memoizedCases,
        memoizedMaintenanceWindows,
        columns,
        id,
        leadingControlColumns,
        showAlertStatusWithFlapping,
        trailingControlColumns,
        visibleColumns,
        browserFields,
        onToggleColumn,
        onResetColumns,
        onChangeVisibleColumns,
        onColumnResize,
        query,
        rowHeightsOptions,
        cellContext,
        gridStyle,
        persistentControls,
        showInspectButton,
        toolbarVisibility,
        shouldHighlightRow,
        dynamicRowHeight,
        ruleTypeIds,
        querySnapshot,
        queryParams.pageIndex,
        queryParams.pageSize,
        sort,
        isLoading,
        alerts,
        oldAlertsData,
        ecsAlertsData,
        refetchAlerts,
        alertsCount,
        onSortChange,
        onPageChange,
        fieldFormats,
        height,
      ]
    );

    const alertsTableContext = useMemo(() => {
      return {
        mutedAlerts: mutedAlerts ?? {},
        bulkActions: activeBulkActionsReducer,
      };
    }, [activeBulkActionsReducer, mutedAlerts]);

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
      <AlertsTableContext.Provider value={alertsTableContext}>
        {!isLoading && alertsCount <= 0 && (
          <InspectButtonContainer>
            <EmptyState
              controls={persistentControls}
              querySnapshot={querySnapshot}
              showInspectButton={showInspectButton}
              height={emptyStateHeight}
            />
          </InspectButtonContainer>
        )}
        {(isLoading || isBrowserFieldDataLoading) && (
          <EuiProgress size="xs" color="accent" data-test-subj="internalAlertsPageLoading" />
        )}
        {alertsCount > 0 &&
          (isCasesContextAvailable ? (
            <CasesContext
              owner={alertsTableConfiguration.cases?.owner ?? []}
              permissions={casesPermissions}
              features={{ alerts: { sync: alertsTableConfiguration.cases?.syncAlerts ?? false } }}
            >
              <AlertsTable {...tableProps} />
            </CasesContext>
          ) : (
            <AlertsTable {...tableProps} />
          ))}
      </AlertsTableContext.Provider>
    );
  }
);

AlertsTableStateWithQueryProvider.displayName = 'AlertsTableStateWithQueryProvider';

export { AlertsTableState };
// eslint-disable-next-line import/no-default-export
export { AlertsTableState as default };
